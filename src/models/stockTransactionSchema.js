import mongoose from "mongoose";

const stockTransactionSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  // Snapshot item data
  itemSku: String,
  itemName: String,
  
  type: {
    type: String,
    enum: ['IN', 'OUT', 'ADJUST'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  reference: {
    module: {
      type: String,
      enum: [
        'purchase',
        'sales', 
        'manual_adjustment', 
        'initial_stock', 
        'correction',
        'purchase_cancel',
        'sales_return',
        'damaged',
        'transfer'
      ],
      required: true
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    },
    number: String // Purchase/Sales number untuk display
  },
  note: {
    type: String,
    trim: true
  },
  previousStock: {
    type: Number,
    required: true,
    default: 0
  },
  newStock: {
    type: Number,
    required: true,
    default: 0
  },
  // ← TAMBAH: Cost tracking (untuk COGS calculation)
  unitCost: {
    type: Number,
    min: 0
  },
  totalCost: {
    type: Number,
    min: 0
  },
  // Audit trail
  createdBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true
});

// Index untuk query yang cepat
stockTransactionSchema.index({ item: 1, createdAt: -1 });
stockTransactionSchema.index({ 'reference.module': 1, 'reference.id': 1 });
stockTransactionSchema.index({ type: 1, createdAt: -1 });
stockTransactionSchema.index({ item: 1, type: 1 });

// Pre-save: Calculate total cost
stockTransactionSchema.pre('save', function(next) {
  if (this.unitCost && this.quantity) {
    this.totalCost = Math.abs(this.quantity) * this.unitCost;
  }
  next();
});

// Static method untuk get stock history
stockTransactionSchema.statics.getStockHistory = async function(itemId, startDate, endDate) {
  const filter = { item: itemId };
  
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  
  return this.find(filter).sort({ createdAt: -1 });
};

export const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);