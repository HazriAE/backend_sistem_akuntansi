import express from 'express';
import inventoryController from '../controllers/inventoryController.js';

const router = express.Router();

/**
 * ========================
 * ITEM CRUD
 * ========================
 */
router.get('/items', inventoryController.getAllItems);
router.get('/items/:id', inventoryController.getItemById);
router.post('/items', inventoryController.createItem);
router.put('/items/:id', inventoryController.updateItem);
router.delete('/items/:id', inventoryController.deleteItem);

/**
 * ========================
 * STOCK
 * ========================
 */
router.get('/stock/:itemId', inventoryController.getCurrentStock);
router.post('/stock/check', inventoryController.checkStock);
router.post('/stock/adjust', inventoryController.adjustStock);
router.get('/stock/history/:itemId', inventoryController.getStockHistory);

/**
 * ========================
 * REPORTS & SUMMARY
 * ========================
 */
router.get('/low-stock', inventoryController.getLowStock);
router.get('/summary', inventoryController.getSummary);

export default router;
