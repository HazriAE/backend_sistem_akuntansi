import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    enum: ['hardware', 'tools', 'building_materials', 'paint', 'electrical', 'plumbing', 'other']
  },
  unit: {
    type: String,
    required: true,
    enum: ['pcs', 'kg', 'meter', 'liter', 'box', 'pack', 'set', 'roll'],
    default: 'pcs'
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  sellPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minimumStock: {
    type: Number,
    default: 0,
    min: 0
  },
  currentStock: {
    type: Number,
    default: 0,
    min: 0
  },
  // ← TAMBAH: Tracking
  reorderPoint: {
    type: Number,
    default: 0,
    min: 0
  },
  location: {
    type: String,
    trim: true
  },
  barcode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // Allow null but must be unique if exists
  },
  // ← TAMBAH: Tax & Discount
  taxable: {
    type: Boolean,
    default: true
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  // ← TAMBAH: Supplier default
  defaultSupplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Kontak'
  }
}, {
  timestamps: true
});

// Virtual untuk profit margin
itemSchema.virtual('profitMargin').get(function() {
  if (this.costPrice === 0) return 0;
  return ((this.sellPrice - this.costPrice) / this.costPrice * 100).toFixed(2);
});

// Virtual untuk low stock warning
itemSchema.virtual('isLowStock').get(function() {
  return this.currentStock <= this.reorderPoint;
});

// Index untuk search dan filtering
itemSchema.index({ sku: 1 });
itemSchema.index({ name: 'text', description: 'text' });
itemSchema.index({ category: 1, status: 1 });

// Method untuk check stock availability
itemSchema.methods.hasStock = function(quantity) {
  return this.currentStock >= quantity;
};

export const Item = mongoose.model('Item', itemSchema);