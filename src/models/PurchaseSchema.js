import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  // Snapshot data
  itemSku: String,
  itemName: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: String,
    required: true
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
});

const purchaseSchema = new mongoose.Schema({
  purchaseNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  // ← FIX: Reference ke Kontak
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kontak',
    required: true
  },
  // Snapshot supplier data
  supplierName: String,
  supplierAddress: String,
  supplierPhone: String,
  
  items: [purchaseItemSchema],
  
  // Calculation
  subtotal: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  discountTotal: {
    type: Number,
    default: 0,
    min: 0
  },
  subtotalAfterDiscount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  taxRate: {
    type: Number,
    default: 11, // PPN 11%
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  
  // ← TAMBAH: Payment tracking
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'approved', 'received', 'completed', 'cancelled'],
    default: 'draft'
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid'
  },
  
  // Dates
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  receivedDate: {
    type: Date
  },
  
  // ← TAMBAH: Jurnal integration
  jurnalEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JurnalEntry'
  },
  
  // Additional info
  notes: {
    type: String,
    trim: true
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  
  // Audit trail
  createdBy: {
    type: String,
    default: 'system'
  },
  approvedBy: {
    type: String
  },
  approvedAt: {
    type: Date
  },
  receivedBy: {
    type: String
  },
  cancelledBy: {
    type: String
  },
  cancelledAt: {
    type: Date
  },
  cancelledReason: {
    type: String
  }
}, {
  timestamps: true
});

// Pre-save: Calculate totals
purchaseSchema.pre('save', function(next) {
  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice);
  }, 0);
  
  // Calculate discount
  this.discountTotal = this.items.reduce((sum, item) => {
    return sum + (item.discountAmount || 0);
  }, 0);
  
  // Subtotal after discount
  this.subtotalAfterDiscount = this.subtotal - this.discountTotal;
  
  // Calculate tax
  this.taxAmount = (this.subtotalAfterDiscount * this.taxRate) / 100;
  
  // Calculate total
  this.total = this.subtotalAfterDiscount + this.taxAmount;
  
  // Calculate remaining balance
  this.remainingBalance = this.total - this.paidAmount;
  
  // Update payment status
  if (this.paidAmount === 0) {
    this.paymentStatus = 'unpaid';
  } else if (this.paidAmount >= this.total) {
    this.paymentStatus = 'paid';
  } else {
    this.paymentStatus = 'partial';
  }
  
  next();
});

// Index
purchaseSchema.index({ purchaseNumber: 1 });
purchaseSchema.index({ supplier: 1, purchaseDate: -1 });
purchaseSchema.index({ status: 1, paymentStatus: 1 });
purchaseSchema.index({ purchaseDate: -1 });
purchaseSchema.index({ dueDate: 1, paymentStatus: 1 }); // For aging report

// Virtual untuk overdue check
purchaseSchema.virtual('isOverdue').get(function() {
  if (this.paymentStatus === 'paid') return false;
  return new Date() > this.dueDate;
});

// Virtual untuk days overdue
purchaseSchema.virtual('daysOverdue').get(function() {
  if (!this.isOverdue) return 0;
  const diff = new Date() - this.dueDate;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

export const Purchase = mongoose.model('Purchase', purchaseSchema);