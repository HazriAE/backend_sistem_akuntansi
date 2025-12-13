// ==================== FILE: src/routes/salesRoutes.js ====================

import express from 'express';
import { salesController } from '../controllers/salesController.js';
// import { authenticate, authorize } from '../middleware/auth.js'; // Uncomment when auth ready

const router = express.Router();

// Create & List
router.post('/', salesController.createSales);
router.get('/', salesController.getAllSales);

// Reports
router.get('/outstanding', salesController.getOutstandingSales);
router.get('/aging-report', salesController.getAgingReport);
router.get('/performance', salesController.getPerformanceReport);

// Single sales operations
router.get('/:id', salesController.getSalesById);
router.put('/:id', salesController.updateSales);
router.delete('/:id', salesController.deleteSales);

// Status changes (add authorize middleware for production)
router.put('/:id/approve', salesController.approveSales);
router.put('/:id/complete', salesController.completeSales);
router.put('/:id/cancel', salesController.cancelSales);

// Payment
router.post('/:id/payment', salesController.recordPayment);

export default router;
