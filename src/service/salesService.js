// ==================== FILE: src/services/salesService.js ====================

import { Akun } from '../models/akunSchema.js';
import { Sales } from '../models/salesSchema.js';
import { Item } from '../models/item.js';
import { Kontak } from '../models/kontakSchema.js';
import { JurnalEntry } from '../models/jurnalEntrySchema.js';
import { inventoryService } from './inventoryService.js';
import { generateInvoiceNumber } from '../utils/numberGenerator.js';

export const salesService = {
  /**
   * Create new sales invoice
   */
  createSales: async (data, createdBy = 'system') => {
    // Validate customer
    const customer = await Kontak.findById(data.customer);
    if (!customer) throw new Error('Customer not found');
    if (customer.tipe !== 'customer' && customer.tipe !== 'both') {
      throw new Error('Invalid customer type');
    }

    // Generate invoice number if not provided
    if (!data.invoiceNumber) {
      data.invoiceNumber = await generateInvoiceNumber();
    }

    // Populate item details and check stock
    for (let i = 0; i < data.items.length; i++) {
      const item = await Item.findById(data.items[i].item);
      if (!item) throw new Error(`Item not found: ${data.items[i].item}`);
      if (item.status !== 'active') throw new Error(`Item is not active: ${item.name}`);

      // Check stock availability
      const quantity = data.items[i].quantity;
      if (!item.hasStock(quantity)) {
        throw new Error(`Insufficient stock for ${item.name}. Available: ${item.currentStock}, Required: ${quantity}`);
      }

      // Snapshot item data
      data.items[i].itemSku = item.sku;
      data.items[i].itemName = item.name;
      data.items[i].unit = item.unit;

      // Calculate subtotal
      const unitPrice = data.items[i].unitPrice;
      const discountAmount = data.items[i].discountAmount || 0;
      data.items[i].subtotal = (unitPrice * quantity) - discountAmount;
    }

    // Snapshot customer data
    data.customerName = customer.nama;
    data.customerAddress = customer.alamat;
    data.customerPhone = customer.noHp;
    data.createdBy = createdBy;

    // Create sales
    const sales = new Sales(data);
    await sales.save();

    return sales;
  },

  /**
   * Approve sales (will reduce stock)
   */
  approveSales: async (salesId, approvedBy = 'system') => {
    const sales = await Sales.findById(salesId);
    if (!sales) throw new Error('Sales not found');

    if (sales.status === 'cancelled') {
      throw new Error('Cannot approve cancelled sales');
    }

    if (sales.status === 'approved' || sales.status === 'completed') {
      throw new Error('Sales already approved');
    }

    // Check stock availability for all items
    for (let sItem of sales.items) {
      const check = await inventoryService.checkStockAvailability(sItem.item, sItem.quantity);
      if (!check.available) {
        throw new Error(`Insufficient stock for ${sItem.itemName}. Available: ${check.currentStock}, Required: ${sItem.quantity}`);
      }
    }

    // Reduce stock for each item
    for (let sItem of sales.items) {
      // Get item cost for COGS
      const item = await Item.findById(sItem.item);
      const unitCost = item.costPrice;

      await inventoryService.reduceStock(
        sItem.item,
        sItem.quantity,
        unitCost, // Use cost price for COGS
        {
          module: 'sales',
          id: sales._id,
          number: sales.invoiceNumber
        },
        `Sales: ${sales.invoiceNumber}`
      );
    }

    // Generate jurnal entry
    await salesService.generateJurnalEntry(sales);

    // Update sales status
    sales.status = 'approved';
    sales.approvedBy = approvedBy;
    sales.approvedAt = new Date();
    await sales.save();

    return sales;
  },

  /**
   * Mark sales as completed
   */
  completeSales: async (salesId) => {
    const sales = await Sales.findById(salesId);
    if (!sales) throw new Error('Sales not found');

    if (sales.status !== 'approved') {
      throw new Error('Sales must be approved first');
    }

    if (sales.paymentStatus !== 'paid') {
      throw new Error('Sales must be fully paid to complete');
    }

    sales.status = 'completed';
    await sales.save();

    return sales;
  },

  /**
   * Cancel sales (will restore stock)
   */
  cancelSales: async (salesId, reason, cancelledBy = 'system') => {
    const sales = await Sales.findById(salesId);
    if (!sales) throw new Error('Sales not found');

    if (sales.status === 'cancelled') {
      throw new Error('Sales already cancelled');
    }

    if (sales.paymentStatus === 'paid') {
      throw new Error('Cannot cancel paid sales');
    }

    // If sales was approved, restore the stock
    if (sales.status === 'approved' || sales.status === 'completed') {
      for (let sItem of sales.items) {
        const item = await Item.findById(sItem.item);
        const unitCost = item.costPrice;

        await inventoryService.addStock(
          sItem.item,
          sItem.quantity,
          unitCost,
          {
            module: 'sales_return',
            id: sales._id,
            number: sales.invoiceNumber
          },
          `Sales Cancelled: ${sales.invoiceNumber} - ${reason}`
        );
      }

      // Void jurnal entry if exists
      if (sales.jurnalEntry) {
        const jurnal = await JurnalEntry.findById(sales.jurnalEntry);
        if (jurnal && jurnal.status === 'posted') {
          jurnal.status = 'void';
          await jurnal.save();
        }
      }
    }

    // Update sales status
    sales.status = 'cancelled';
    sales.cancelledBy = cancelledBy;
    sales.cancelledAt = new Date();
    sales.cancelledReason = reason;
    await sales.save();

    return sales;
  },

  /**
   * Update sales (only draft status)
   */
  updateSales: async (salesId, data) => {
    const sales = await Sales.findById(salesId);
    if (!sales) throw new Error('Sales not found');

    if (sales.status !== 'draft') {
      throw new Error('Only draft sales can be updated');
    }

    // Update item details
    if (data.items) {
      for (let i = 0; i < data.items.length; i++) {
        const item = await Item.findById(data.items[i].item);
        if (!item) throw new Error(`Item not found: ${data.items[i].item}`);

        // Check stock
        if (!item.hasStock(data.items[i].quantity)) {
          throw new Error(`Insufficient stock for ${item.name}`);
        }

        data.items[i].itemSku = item.sku;
        data.items[i].itemName = item.name;
        data.items[i].unit = item.unit;

        const unitPrice = data.items[i].unitPrice;
        const quantity = data.items[i].quantity;
        const discountAmount = data.items[i].discountAmount || 0;
        data.items[i].subtotal = (unitPrice * quantity) - discountAmount;
      }
    }

    // Update customer snapshot if customer changed
    if (data.customer && data.customer !== sales.customer.toString()) {
      const customer = await Kontak.findById(data.customer);
      if (!customer) throw new Error('Customer not found');
      
      data.customerName = customer.nama;
      data.customerAddress = customer.alamat;
      data.customerPhone = customer.noHp;
    }

    // Update sales
    Object.assign(sales, data);
    await sales.save();

    return sales;
  },

  /**
   * Delete sales (only draft status)
   */
  deleteSales: async (salesId) => {
    const sales = await Sales.findById(salesId);
    if (!sales) throw new Error('Sales not found');

    if (sales.status !== 'draft') {
      throw new Error('Only draft sales can be deleted');
    }

    await Sales.findByIdAndDelete(salesId);
    return { message: 'Sales deleted successfully' };
  },

  /**
   * Generate jurnal entry from sales
   */
  generateJurnalEntry: async (sales) => {
    // Find required accounts
    const piutangAkun = await Akun.findOne({ 
      kodeAkun: { $regex: '^1-11' }, 
      kategori: 'piutang',
      aktif: true 
    });

    const penjualanAkun = await Akun.findOne({ 
      kodeAkun: { $regex: '^4-' }, 
      kategori: 'penjualan',
      aktif: true 
    });

    if (!piutangAkun || !penjualanAkun) {
      throw new Error('Required accounts not found for journal entry');
    }

    // Create journal entry
    const jurnalData = {
      nomorJurnal: `JRN-SAL-${sales.invoiceNumber}`,
      tanggal: sales.invoiceDate,
      deskripsi: `Penjualan kepada ${sales.customerName} - ${sales.invoiceNumber}`,
      jenisTransaksi: 'penjualan',
      referensi: {
        tipe: 'kontak',
        id: sales.customer
      },
      items: [
        {
          akun: piutangAkun._id,
          kodeAkun: piutangAkun.kodeAkun,
          namaAkun: piutangAkun.namaAkun,
          debit: sales.total,
          kredit: 0,
          keterangan: `Piutang - ${sales.invoiceNumber}`
        },
        {
          akun: penjualanAkun._id,
          kodeAkun: penjualanAkun.kodeAkun,
          namaAkun: penjualanAkun.namaAkun,
          debit: 0,
          kredit: sales.total,
          keterangan: `Penjualan - ${sales.customerName}`
        }
      ],
      status: 'posted',
      dibuatOleh: sales.createdBy
    };

    const jurnal = await JurnalEntry.create(jurnalData);

    // Link jurnal to sales
    sales.jurnalEntry = jurnal._id;
    await sales.save();

    return jurnal;
  },

  /**
   * Get sales by ID
   */
  getSalesById: async (salesId) => {
    const sales = await Sales.findById(salesId)
      .populate('customer', 'kode nama alamat noHp email')
      .populate('items.item', 'sku name unit')
      .populate('jurnalEntry');

    if (!sales) throw new Error('Sales not found');
    return sales;
  },

  /**
   * Get all sales with filters
   */
  getAllSales: async (filters = {}) => {
    const query = {};

    if (filters.customer) query.customer = filters.customer;
    if (filters.status) query.status = filters.status;
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
    
    if (filters.startDate || filters.endDate) {
      query.invoiceDate = {};
      if (filters.startDate) query.invoiceDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.invoiceDate.$lte = new Date(filters.endDate);
    }

    const sales = await Sales.find(query)
      .populate('customer', 'kode nama')
      .sort({ invoiceDate: -1 });

    return sales;
  },

  /**
   * Get outstanding sales (unpaid/partial)
   */
  getOutstandingSales: async (customerId = null) => {
    const query = {
      status: { $in: ['approved', 'completed'] },
      paymentStatus: { $in: ['unpaid', 'partial'] }
    };

    if (customerId) {
      query.customer = customerId;
    }

    const sales = await Sales.find(query)
      .populate('customer', 'kode nama')
      .sort({ dueDate: 1 });

    return sales;
  },

  /**
   * Get aging report for accounts receivable
   */
  getAgingReport: async () => {
    const sales = await Sales.find({
      status: { $in: ['approved', 'completed'] },
      paymentStatus: { $in: ['unpaid', 'partial'] }
    }).populate('customer', 'kode nama');

    const today = new Date();
    const aging = {
      current: [],
      days1to30: [],
      days31to60: [],
      days61to90: [],
      days90plus: []
    };

    sales.forEach(invoice => {
      const daysOverdue = Math.floor((today - invoice.dueDate) / (1000 * 60 * 60 * 24));
      
      if (daysOverdue <= 0) {
        aging.current.push(invoice);
      } else if (daysOverdue <= 30) {
        aging.days1to30.push(invoice);
      } else if (daysOverdue <= 60) {
        aging.days31to60.push(invoice);
      } else if (daysOverdue <= 90) {
        aging.days61to90.push(invoice);
      } else {
        aging.days90plus.push(invoice);
      }
    });

    // Calculate totals
    const calculateTotal = (list) => list.reduce((sum, s) => sum + s.remainingBalance, 0);

    return {
      aging,
      summary: {
        current: calculateTotal(aging.current),
        days1to30: calculateTotal(aging.days1to30),
        days31to60: calculateTotal(aging.days31to60),
        days61to90: calculateTotal(aging.days61to90),
        days90plus: calculateTotal(aging.days90plus),
        total: calculateTotal([
          ...aging.current,
          ...aging.days1to30,
          ...aging.days31to60,
          ...aging.days61to90,
          ...aging.days90plus
        ])
      }
    };
  }
};