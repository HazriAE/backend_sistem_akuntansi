import { Purchase } from '../models/PurchaseSchema.js';
import { Item } from '../models/item.js';
import { Kontak } from '../models/kontakSchema.js';
import { JurnalEntry } from '../models/jurnalEntrySchema.js';
import { inventoryService } from './inventoryService.js';
import { generatePurchaseNumber } from '../utils/numberGenerator.js';
import { Akun } from '../models/akunSchema.js';

export const purchaseService = {
  /**
   * Create new purchase
   */
  createPurchase: async (data, createdBy = 'system') => {
    // Validate supplier
    const supplier = await Kontak.findById(data.supplier);
    if (!supplier) throw new Error('Supplier not found');
    if (supplier.tipe !== 'supplier' && supplier.tipe !== 'both') {
      throw new Error('Invalid supplier type');
    }

    // Generate purchase number if not provided
    if (!data.purchaseNumber) {
      data.purchaseNumber = await generatePurchaseNumber();
    }

    // Populate item details and validate stock
    for (let i = 0; i < data.items.length; i++) {
      const item = await Item.findById(data.items[i].item);
      if (!item) throw new Error(`Item not found: ${data.items[i].item}`);
      if (item.status !== 'active') throw new Error(`Item is not active: ${item.name}`);

      // Snapshot item data
      data.items[i].itemSku = item.sku;
      data.items[i].itemName = item.name;
      data.items[i].unit = item.unit;

      // Calculate subtotal
      const unitPrice = data.items[i].unitPrice;
      const quantity = data.items[i].quantity;
      const discountAmount = data.items[i].discountAmount || 0;
      data.items[i].subtotal = (unitPrice * quantity) - discountAmount;
    }

    // Snapshot supplier data
    data.supplierName = supplier.nama;
    data.supplierAddress = supplier.alamat;
    data.supplierPhone = supplier.noHp;
    data.createdBy = createdBy;

    // Create purchase
    const purchase = new Purchase(data);
    await purchase.save();

    return purchase;
  },

  /**
   * Approve purchase (will add stock)
   */
  approvePurchase: async (purchaseId, approvedBy = 'system') => {
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) throw new Error('Purchase not found');

    if (purchase.status === 'cancelled') {
      throw new Error('Cannot approve cancelled purchase');
    }

    if (purchase.status === 'approved' || purchase.status === 'received') {
      throw new Error('Purchase already approved');
    }

    // Add stock for each item
    for (let pItem of purchase.items) {
      await inventoryService.addStock(
        pItem.item,
        pItem.quantity,
        pItem.unitPrice, // Use purchase price as cost
        {
          module: 'purchase',
          id: purchase._id,
          number: purchase.purchaseNumber
        },
        `Purchase: ${purchase.purchaseNumber}`
      );
    }

    // Generate jurnal entry
    await purchaseService.generateJurnalEntry(purchase);

    // Update purchase status
    purchase.status = 'approved';
    purchase.approvedBy = approvedBy;
    purchase.approvedAt = new Date();
    await purchase.save();

    return purchase;
  },

  /**
   * Mark purchase as received
   */
  receivePurchase: async (purchaseId, receivedBy = 'system') => {
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) throw new Error('Purchase not found');

    if (purchase.status !== 'approved') {
      throw new Error('Purchase must be approved first');
    }

    purchase.status = 'received';
    purchase.receivedBy = receivedBy;
    purchase.receivedDate = new Date();
    await purchase.save();

    return purchase;
  },

  /**
   * Cancel purchase (will reverse stock)
   */
  cancelPurchase: async (purchaseId, reason, cancelledBy = 'system') => {
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) throw new Error('Purchase not found');

    if (purchase.status === 'cancelled') {
      throw new Error('Purchase already cancelled');
    }

    if (purchase.paymentStatus === 'paid') {
      throw new Error('Cannot cancel paid purchase');
    }

    // If purchase was approved, reverse the stock
    if (purchase.status === 'approved' || purchase.status === 'received') {
      for (let pItem of purchase.items) {
        await inventoryService.reduceStock(
          pItem.item,
          pItem.quantity,
          pItem.unitPrice,
          {
            module: 'purchase_cancel',
            id: purchase._id,
            number: purchase.purchaseNumber
          },
          `Purchase Cancelled: ${purchase.purchaseNumber} - ${reason}`
        );
      }

      // Void jurnal entry if exists
      if (purchase.jurnalEntry) {
        const jurnal = await JurnalEntry.findById(purchase.jurnalEntry);
        if (jurnal && jurnal.status === 'posted') {
          jurnal.status = 'void';
          await jurnal.save();
        }
      }
    }

    // Update purchase status
    purchase.status = 'cancelled';
    purchase.cancelledBy = cancelledBy;
    purchase.cancelledAt = new Date();
    purchase.cancelledReason = reason;
    await purchase.save();

    return purchase;
  },

  /**
   * Update purchase (only draft status)
   */
  updatePurchase: async (purchaseId, data) => {
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) throw new Error('Purchase not found');

    if (purchase.status !== 'draft') {
      throw new Error('Only draft purchases can be updated');
    }

    // Update item details
    if (data.items) {
      for (let i = 0; i < data.items.length; i++) {
        const item = await Item.findById(data.items[i].item);
        if (!item) throw new Error(`Item not found: ${data.items[i].item}`);

        data.items[i].itemSku = item.sku;
        data.items[i].itemName = item.name;
        data.items[i].unit = item.unit;

        const unitPrice = data.items[i].unitPrice;
        const quantity = data.items[i].quantity;
        const discountAmount = data.items[i].discountAmount || 0;
        data.items[i].subtotal = (unitPrice * quantity) - discountAmount;
      }
    }

    // Update supplier snapshot if supplier changed
    if (data.supplier && data.supplier !== purchase.supplier.toString()) {
      const supplier = await Kontak.findById(data.supplier);
      if (!supplier) throw new Error('Supplier not found');
      
      data.supplierName = supplier.nama;
      data.supplierAddress = supplier.alamat;
      data.supplierPhone = supplier.noHp;
    }

    // Update purchase
    Object.assign(purchase, data);
    await purchase.save();

    return purchase;
  },

  /**
   * Delete purchase (only draft status)
   */
  deletePurchase: async (purchaseId) => {
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase) throw new Error('Purchase not found');

    if (purchase.status !== 'draft') {
      throw new Error('Only draft purchases can be deleted');
    }

    await Purchase.findByIdAndDelete(purchaseId);
    return { message: 'Purchase deleted successfully' };
  },

  /**
   * Generate jurnal entry from purchase
   */
  generateJurnalEntry: async (purchase) => {
    // Find required accounts
    const persediaanAkun = await Akun.findOne({ 
      kodeAkun: { $regex: '^1-11' }, 
      kategori: 'persediaan',
      aktif: true 
    });

    const utangAkun = await Akun.findOne({ 
      kodeAkun: { $regex: '^2-11' }, 
      namaAkun: { $regex: /utang.*usaha/i },
      aktif: true 
    });

    if (!persediaanAkun || !utangAkun) {
      throw new Error('Required accounts not found for journal entry');
    }

    // Create journal entry
    const jurnalData = {
      nomorJurnal: `JRN-PUR-${purchase.purchaseNumber}`,
      tanggal: purchase.purchaseDate,
      deskripsi: `Pembelian dari ${purchase.supplierName} - ${purchase.purchaseNumber}`,
      jenisTransaksi: 'pembelian',
      referensi: {
        tipe: 'kontak',
        id: purchase.supplier
      },
      items: [
        {
          akun: persediaanAkun._id,
          kodeAkun: persediaanAkun.kodeAkun,
          namaAkun: persediaanAkun.namaAkun,
          debit: purchase.total,
          kredit: 0,
          keterangan: `Persediaan - ${purchase.purchaseNumber}`
        },
        {
          akun: utangAkun._id,
          kodeAkun: utangAkun.kodeAkun,
          namaAkun: utangAkun.namaAkun,
          debit: 0,
          kredit: purchase.total,
          keterangan: `Utang Usaha - ${purchase.supplierName}`
        }
      ],
      status: 'posted',
      dibuatOleh: purchase.createdBy
    };

    const jurnal = await JurnalEntry.create(jurnalData);

    // Link jurnal to purchase
    purchase.jurnalEntry = jurnal._id;
    await purchase.save();

    return jurnal;
  },

  /**
   * Get purchase by ID
   */
  getPurchaseById: async (purchaseId) => {
    const purchase = await Purchase.findById(purchaseId)
      .populate('supplier', 'kode nama alamat noHp email')
      .populate('items.item', 'sku name unit')
      .populate('jurnalEntry');

    if (!purchase) throw new Error('Purchase not found');
    return purchase;
  },

  /**
   * Get all purchases with filters
   */
  getAllPurchases: async (filters = {}) => {
    const query = {};

    if (filters.supplier) query.supplier = filters.supplier;
    if (filters.status) query.status = filters.status;
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
    
    if (filters.startDate || filters.endDate) {
      query.purchaseDate = {};
      if (filters.startDate) query.purchaseDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.purchaseDate.$lte = new Date(filters.endDate);
    }

    const purchases = await Purchase.find(query)
      .populate('supplier', 'kode nama')
      .sort({ purchaseDate: -1 });

    return purchases;
  },

  /**
   * Get outstanding purchases (unpaid/partial)
   */
  getOutstandingPurchases: async (supplierId = null) => {
    const query = {
      status: { $in: ['approved', 'received', 'completed'] },
      paymentStatus: { $in: ['unpaid', 'partial'] }
    };

    if (supplierId) {
      query.supplier = supplierId;
    }

    const purchases = await Purchase.find(query)
      .populate('supplier', 'kode nama')
      .sort({ dueDate: 1 });

    return purchases;
  },

  /**
   * Get aging report for accounts payable
   */
  getAgingReport: async () => {
    const purchases = await Purchase.find({
      status: { $in: ['approved', 'received', 'completed'] },
      paymentStatus: { $in: ['unpaid', 'partial'] }
    }).populate('supplier', 'kode nama');

    const today = new Date();
    const aging = {
      current: [],
      days1to30: [],
      days31to60: [],
      days61to90: [],
      days90plus: []
    };

    purchases.forEach(purchase => {
      const daysOverdue = Math.floor((today - purchase.dueDate) / (1000 * 60 * 60 * 24));
      
      if (daysOverdue <= 0) {
        aging.current.push(purchase);
      } else if (daysOverdue <= 30) {
        aging.days1to30.push(purchase);
      } else if (daysOverdue <= 60) {
        aging.days31to60.push(purchase);
      } else if (daysOverdue <= 90) {
        aging.days61to90.push(purchase);
      } else {
        aging.days90plus.push(purchase);
      }
    });

    // Calculate totals
    const calculateTotal = (list) => list.reduce((sum, p) => sum + p.remainingBalance, 0);

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