// ==================== FILE: src/services/salesService.js ====================

import { Akun } from '../models/akunSchema.js';
import { Sales } from '../models/salesSchema.js';
import { Kontak } from '../models/kontakSchema.js';
import { JurnalEntry } from '../models/jurnalEntrySchema.js';
import { inventoryService } from './inventoryService.js';
import { generateInvoiceNumber } from '../utils/numberGenerator.js';
import { Item } from '../models/Item.js';

export const salesService = {
  /**
   * Create new sales invoice (Draft)
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
   * Approve sales (Metode Perpetual)
   * 
   * Flow:
   * 1. Validasi status & stock
   * 2. Hitung total HPP
   * 3. Generate jurnal entry (Piutang/Penjualan + HPP/Persediaan)
   * 4. Kurangi stock fisik via inventoryService
   * 5. Update status sales
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

    // Calculate total HPP/COGS dan simpan detail per item
    let totalHPP = 0;
    const itemsWithCost = [];
    
    for (let sItem of sales.items) {
      const item = await Item.findById(sItem.item);
      const unitCost = item.costPrice;
      const totalCost = unitCost * sItem.quantity;
      
      totalHPP += totalCost;
      itemsWithCost.push({
        itemId: sItem.item,
        quantity: sItem.quantity,
        unitCost,
        totalCost,
        itemName: sItem.itemName
      });
    }

    // 1. Generate jurnal entry DULU (sebelum update stock)
    const jurnal = await salesService.generateJurnalEntry(sales, totalHPP);

    // 2. Kurangi stock fisik (inventory service hanya update stock, tidak buat jurnal)
    for (let itemData of itemsWithCost) {
      await inventoryService.reduceStock(
        itemData.itemId,
        itemData.quantity,
        itemData.unitCost,
        {
          module: 'sales',
          id: sales._id,
          number: sales.invoiceNumber
        },
        `Sales: ${sales.invoiceNumber}`
      );
    }

    // 3. Update sales status
    sales.status = 'approved';
    sales.approvedBy = approvedBy;
    sales.approvedAt = new Date();
    sales.jurnalEntry = jurnal._id;
    await sales.save();

    return sales;
  },

  /**
   * Generate jurnal entry untuk penjualan (Metode Perpetual)
   * 
   * Jurnal yang dibuat (4 baris):
   * 
   * 1. Dr. Piutang Usaha (1-1103)          xxx
   *    Cr. Penjualan Bersih (4-1001)           xxx
   *    (Mencatat pendapatan penjualan)
   * 
   * 2. Dr. Beban Pokok Penjualan (5-1001)  xxx
   *    Cr. Persediaan (1-1105)                 xxx
   *    (Mencatat HPP dan pengurangan persediaan)
   */
  generateJurnalEntry: async (sales, totalHPP) => {
    // Find required accounts
    const piutangAkun = await Akun.findOne({ 
      kodeAkun: '1-1103',  // Piutang Usaha - Pihak Ketiga
      aktif: true 
    });

    const penjualanAkun = await Akun.findOne({ 
      kodeAkun: '4-1001',  // Penjualan Bersih
      aktif: true 
    });

    const hppAkun = await Akun.findOne({ 
      kodeAkun: '5-1001',  // Beban Pokok Penjualan
      aktif: true 
    });

    const persediaanAkun = await Akun.findOne({ 
      kodeAkun: '1-1105',  // Persediaan
      aktif: true 
    });

    if (!piutangAkun || !penjualanAkun || !hppAkun || !persediaanAkun) {
      throw new Error('Required accounts not found. Please ensure accounts 1-1103, 4-1001, 5-1001, and 1-1105 exist.');
    }

    // Create journal entry dengan 4 baris (2 pasang jurnal sekaligus)
    const jurnalData = {
      nomorJurnal: `JRN-SAL-${sales.invoiceNumber}`,
      tanggal: sales.invoiceDate,
      deskripsi: `Penjualan kepada ${sales.customerName} - Invoice ${sales.invoiceNumber}`,
      jenisTransaksi: 'penjualan',
      referensi: {
        tipe: 'kontak',
        id: sales.customer
      },
      items: [
        // === JURNAL 1: Mencatat Penjualan (Revenue Recognition) ===
        {
          akun: piutangAkun._id,
          kodeAkun: piutangAkun.kodeAkun,
          namaAkun: piutangAkun.namaAkun,
          debit: sales.total,
          kredit: 0,
          keterangan: `Piutang ${sales.customerName} - ${sales.invoiceNumber}`
        },
        {
          akun: penjualanAkun._id,
          kodeAkun: penjualanAkun.kodeAkun,
          namaAkun: penjualanAkun.namaAkun,
          debit: 0,
          kredit: sales.total,
          keterangan: `Penjualan kepada ${sales.customerName}`
        },
        
        // === JURNAL 2: Mencatat HPP dan Pengurangan Persediaan (COGS) ===
        {
          akun: hppAkun._id,
          kodeAkun: hppAkun.kodeAkun,
          namaAkun: hppAkun.namaAkun,
          debit: totalHPP,
          kredit: 0,
          keterangan: `HPP penjualan - ${sales.invoiceNumber}`
        },
        {
          akun: persediaanAkun._id,
          kodeAkun: persediaanAkun.kodeAkun,
          namaAkun: persediaanAkun.namaAkun,
          debit: 0,
          kredit: totalHPP,
          keterangan: `Pengurangan persediaan - ${sales.invoiceNumber}`
        }
      ],
      status: 'posted',
      dibuatOleh: sales.createdBy
    };

    const jurnal = await JurnalEntry.create(jurnalData);
    return jurnal;
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
   * Cancel sales (Metode Perpetual)
   * 
   * Flow:
   * 1. Validasi (tidak bisa cancel yang sudah paid)
   * 2. Jika sudah approved: buat jurnal pembalik + restore stock
   * 3. Update status cancelled
   */
  cancelSales: async (salesId, reason, cancelledBy = 'system') => {
    const sales = await Sales.findById(salesId);
    if (!sales) throw new Error('Sales not found');

    if (sales.status === 'cancelled') {
      throw new Error('Sales already cancelled');
    }

    if (sales.paymentStatus === 'paid') {
      throw new Error('Cannot cancel paid sales. Please create sales return instead.');
    }

    // If sales was approved, reverse the entries
    if (sales.status === 'approved' || sales.status === 'completed') {
      // Calculate total HPP for reversal
      let totalHPP = 0;
      const itemsToRestore = [];

      for (let sItem of sales.items) {
        const item = await Item.findById(sItem.item);
        const unitCost = item.costPrice;
        const totalCost = unitCost * sItem.quantity;
        
        totalHPP += totalCost;
        itemsToRestore.push({
          itemId: sItem.item,
          quantity: sItem.quantity,
          unitCost,
          itemName: sItem.itemName
        });
      }

      // 1. Create reversing journal entry
      await salesService.createReversingJournal(sales, totalHPP, reason, cancelledBy);

      // 2. Restore stock fisik
      for (let itemData of itemsToRestore) {
        await inventoryService.addStock(
          itemData.itemId,
          itemData.quantity,
          itemData.unitCost,
          {
            module: 'sales_cancellation',
            id: sales._id,
            number: sales.invoiceNumber
          },
          `Sales Cancelled: ${sales.invoiceNumber} - ${reason}`
        );
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
   * Create reversing journal for cancelled sales
   * 
   * Jurnal pembalik (kebalikan dari jurnal asli):
   * Dr. Penjualan Bersih        xxx
   *     Cr. Piutang Usaha            xxx
   * 
   * Dr. Persediaan              xxx
   *     Cr. Beban Pokok Penjualan    xxx
   */
  createReversingJournal: async (sales, totalHPP, reason, cancelledBy) => {
    const piutangAkun = await Akun.findOne({ kodeAkun: '1-1103', aktif: true });
    const penjualanAkun = await Akun.findOne({ kodeAkun: '4-1001', aktif: true });
    const hppAkun = await Akun.findOne({ kodeAkun: '5-1001', aktif: true });
    const persediaanAkun = await Akun.findOne({ kodeAkun: '1-1105', aktif: true });

    if (!piutangAkun || !penjualanAkun || !hppAkun || !persediaanAkun) {
      throw new Error('Required accounts not found for reversing entry');
    }

    // Jurnal pembalik: posisi Debit-Kredit dibalik
    const jurnalData = {
      nomorJurnal: `JRN-SAL-CANCEL-${sales.invoiceNumber}`,
      tanggal: new Date(),
      deskripsi: `Pembatalan penjualan - ${sales.invoiceNumber} - ${reason}`,
      jenisTransaksi: 'penjualan_batal',
      referensi: {
        tipe: 'kontak',
        id: sales.customer
      },
      items: [
        // Pembalik jurnal penjualan (posisi D-K dibalik)
        {
          akun: penjualanAkun._id,
          kodeAkun: penjualanAkun.kodeAkun,
          namaAkun: penjualanAkun.namaAkun,
          debit: sales.total,  // Tadinya Kredit, jadi Debit
          kredit: 0,
          keterangan: `Pembatalan penjualan - ${sales.invoiceNumber}`
        },
        {
          akun: piutangAkun._id,
          kodeAkun: piutangAkun.kodeAkun,
          namaAkun: piutangAkun.namaAkun,
          debit: 0,
          kredit: sales.total,  // Tadinya Debit, jadi Kredit
          keterangan: `Pembatalan piutang - ${sales.invoiceNumber}`
        },
        
        // Pembalik jurnal HPP (posisi D-K dibalik)
        {
          akun: persediaanAkun._id,
          kodeAkun: persediaanAkun.kodeAkun,
          namaAkun: persediaanAkun.namaAkun,
          debit: totalHPP,  // Tadinya Kredit, jadi Debit
          kredit: 0,
          keterangan: `Pengembalian persediaan - ${sales.invoiceNumber}`
        },
        {
          akun: hppAkun._id,
          kodeAkun: hppAkun.kodeAkun,
          namaAkun: hppAkun.namaAkun,
          debit: 0,
          kredit: totalHPP,  // Tadinya Debit, jadi Kredit
          keterangan: `Pembalik HPP - ${sales.invoiceNumber}`
        }
      ],
      status: 'posted',
      dibuatOleh: cancelledBy
    };

    return await JurnalEntry.create(jurnalData);
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
   * Get sales by ID
   */
  getSalesById: async (salesId) => {
    const sales = await Sales.findById(salesId)
      .populate('customer', 'kode nama alamat noHp email')
      .populate('items.item', 'sku name unit costPrice')
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