import { StockTransaction } from "../models/stockTransactionSchema.js";
import { Item } from "../models/Item.js";

export const inventoryService = {
  /**
   * Add stock (Purchase, Stock In)
   */
  addStock: async (itemId, quantity, unitCost, reference, note = null) => {
    const item = await Item.findById(itemId);
    if (!item) throw new Error('Item not found');

    const previousStock = item.currentStock;
    const newStock = previousStock + quantity;

    // Create stock transaction
    await StockTransaction.create({
      item: itemId,
      itemSku: item.sku,
      itemName: item.name,
      type: "IN",
      quantity: quantity,
      previousStock,
      newStock,
      unitCost,
      totalCost: quantity * unitCost,
      reference,
      note,
      createdAt: new Date()
    });

    // Update item stock
    item.currentStock = newStock;
    await item.save();

    return { previousStock, newStock };
  },

  /**
   * Reduce stock (Sales, Stock Out)
   */
  reduceStock: async (itemId, quantity, unitCost, reference, note = null) => {
    const item = await Item.findById(itemId);
    if (!item) throw new Error('Item not found');

    // Check stock availability
    if (item.currentStock < quantity) {
      throw new Error(`Insufficient stock. Available: ${item.currentStock}, Required: ${quantity}`);
    }

    const previousStock = item.currentStock;
    const newStock = previousStock - quantity;

    // Create stock transaction
    await StockTransaction.create({
      item: itemId,
      itemSku: item.sku,
      itemName: item.name,
      type: "OUT",
      quantity: -quantity, // Negative for OUT
      previousStock,
      newStock,
      unitCost,
      totalCost: quantity * unitCost,
      reference,
      note,
      createdAt: new Date()
    });

    // Update item stock
    item.currentStock = newStock;
    await item.save();

    return { previousStock, newStock };
  },

  /**
   * Adjust stock (Manual adjustment, correction)
   */
  adjustStock: async (itemId, quantityChange, note, createdBy = 'system') => {
    const item = await Item.findById(itemId);
    if (!item) throw new Error('Item not found');

    const previousStock = item.currentStock;
    const newStock = previousStock + quantityChange;

    if (newStock < 0) {
      throw new Error('Stock cannot be negative');
    }

    // Create stock transaction
    await StockTransaction.create({
      item: itemId,
      itemSku: item.sku,
      itemName: item.name,
      type: "ADJUST",
      quantity: quantityChange,
      previousStock,
      newStock,
      reference: { 
        module: "manual_adjustment", 
        id: null 
      },
      note,
      createdBy,
      createdAt: new Date()
    });

    // Update item stock
    item.currentStock = newStock;
    await item.save();

    return { previousStock, newStock };
  },

  /**
   * Get current stock
   */
  getCurrentStock: async (itemId) => {
    const item = await Item.findById(itemId).select("currentStock");
    return item?.currentStock || 0;
  },

  /**
   * Get stock history
   */
  getStockHistory: async (itemId, startDate = null, endDate = null) => {
    return await StockTransaction.getStockHistory(itemId, startDate, endDate);
  },

  /**
   * Check if item has sufficient stock
   */
  checkStockAvailability: async (itemId, quantity) => {
    const item = await Item.findById(itemId);
    if (!item) throw new Error('Item not found');
    
    return {
      available: item.currentStock >= quantity,
      currentStock: item.currentStock,
      required: quantity,
      shortage: Math.max(0, quantity - item.currentStock)
    };
  },

  /**
   * Get low stock items
   */
  getLowStockItems: async () => {
    return await Item.find({
      status: 'active',
      $expr: { $lte: ['$currentStock', '$reorderPoint'] }
    }).sort({ currentStock: 1 });
  },

  /**
   * Batch check stock availability
   */
  batchCheckStock: async (items) => {
    const results = [];
    
    for (let i = 0; i < items.length; i++) {
      const { itemId, quantity } = items[i];
      const check = await inventoryService.checkStockAvailability(itemId, quantity);
      results.push({
        itemId,
        ...check
      });
    }
    
    return results;
  }
};