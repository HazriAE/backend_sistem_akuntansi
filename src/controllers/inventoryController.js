// ==================== FILE: src/controllers/inventoryController.js ====================

import { inventoryService } from '../service/inventoryService.js';
import { Item } from '../models/Item.js';

const inventoryController = {
  /**
   * GET /api/inventory/items
   * Get all items with stock info
   */
  getAllItems: async (req, res) => {
    try {
      const { status, category, search, lowStock } = req.query;
      
      const filter = {};
      
      if (status) filter.status = status;
      if (category) filter.category = category;
      
      if (search) {
        filter.$or = [
          { sku: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ];
      }
      
      let query = Item.find(filter);
      
      // Filter low stock items
      if (lowStock === 'true') {
        query = Item.find({
          ...filter,
          $expr: { $lte: ['$currentStock', '$reorderPoint'] }
        });
      }
      
      const items = await query.sort({ sku: 1 });
      
      res.json({
        success: true,
        count: items.length,
        data: items
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * GET /api/inventory/items/:id
   * Get item detail with stock info
   */
  getItemById: async (req, res) => {
    try {
      const item = await Item.findById(req.params.id);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }
      
      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * POST /api/inventory/items
   * Create new item
   */
  createItem: async (req, res) => {
    try {
      const item = await Item.create(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Item created successfully',
        data: item
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * PUT /api/inventory/items/:id
   * Update item
   */
  updateItem: async (req, res) => {
    try {
      const item = await Item.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Item updated successfully',
        data: item
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * DELETE /api/inventory/items/:id
   * Delete item (soft delete - set status to inactive)
   */
  deleteItem: async (req, res) => {
    try {
      const item = await Item.findByIdAndUpdate(
        req.params.id,
        { status: 'inactive' },
        { new: true }
      );
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Item deleted successfully (set to inactive)'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * GET /api/inventory/stock/:itemId
   * Get current stock for specific item
   */
  getCurrentStock: async (req, res) => {
    try {
      const currentStock = await inventoryService.getCurrentStock(req.params.itemId);
      
      res.json({
        success: true,
        data: {
          itemId: req.params.itemId,
          currentStock
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * POST /api/inventory/stock/check
   * Check stock availability (single or batch)
   */
  checkStock: async (req, res) => {
    try {
      const { itemId, quantity, items } = req.body;
      
      // Single check
      if (itemId && quantity) {
        const result = await inventoryService.checkStockAvailability(itemId, quantity);
        
        return res.json({
          success: true,
          data: result
        });
      }
      
      // Batch check
      if (items && Array.isArray(items)) {
        const results = await inventoryService.batchCheckStock(items);
        
        return res.json({
          success: true,
          data: results
        });
      }
      
      res.status(400).json({
        success: false,
        message: 'Invalid request. Provide either (itemId + quantity) or (items array)'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * POST /api/inventory/stock/adjust
   * Manual stock adjustment
   */
  adjustStock: async (req, res) => {
    try {
      const { itemId, quantityChange, note } = req.body;
      
      if (!itemId || quantityChange === undefined || !note) {
        return res.status(400).json({
          success: false,
          message: 'itemId, quantityChange, and note are required'
        });
      }
      
      const createdBy = req.body.createdBy || req.user?.username || 'system';
      
      const result = await inventoryService.adjustStock(
        itemId,
        quantityChange,
        note,
        createdBy
      );
      
      res.json({
        success: true,
        message: 'Stock adjusted successfully',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * GET /api/inventory/stock/history/:itemId
   * Get stock transaction history
   */
  getStockHistory: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const history = await inventoryService.getStockHistory(
        req.params.itemId,
        startDate,
        endDate
      );
      
      res.json({
        success: true,
        count: history.length,
        data: history
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * GET /api/inventory/low-stock
   * Get items with low stock (below reorder point)
   */
  getLowStock: async (req, res) => {
    try {
      const items = await inventoryService.getLowStockItems();
      
      res.json({
        success: true,
        count: items.length,
        data: items
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * GET /api/inventory/summary
   * Get inventory summary statistics
   */
  getSummary: async (req, res) => {
    try {
      const items = await Item.find({ status: 'active' });
      
      const summary = {
        totalItems: items.length,
        totalStockValue: items.reduce((sum, item) => 
          sum + (item.currentStock * item.costPrice), 0
        ),
        totalRetailValue: items.reduce((sum, item) => 
          sum + (item.currentStock * item.sellPrice), 0
        ),
        lowStockItems: items.filter(item => 
          item.currentStock <= item.reorderPoint
        ).length,
        outOfStockItems: items.filter(item => 
          item.currentStock === 0
        ).length,
        categories: {}
      };
      
      // Group by category
      items.forEach(item => {
        if (!summary.categories[item.category]) {
          summary.categories[item.category] = {
            count: 0,
            totalStock: 0,
            stockValue: 0
          };
        }
        
        summary.categories[item.category].count++;
        summary.categories[item.category].totalStock += item.currentStock;
        summary.categories[item.category].stockValue += 
          item.currentStock * item.costPrice;
      });
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

export default inventoryController;