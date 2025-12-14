// ==================== FILE: src/routes/salesRoutes.js ====================

import express from 'express';
import salesController from '../controllers/salesController.js';

const router = express.Router();

// ==================== SALES ROUTES ====================

/**
 * GET /api/sales
 * Get all sales invoices
 * Query params: ?customer=xxx&status=draft&paymentStatus=unpaid&startDate=2024-01-01&endDate=2024-12-31
 */
router.get('/sales', salesController.getAll);

/**
 * GET /api/sales/outstanding
 * Get outstanding sales (unpaid/partial)
 * Query params: ?customerId=xxx
 * 
 * NOTE: Must be before /:id to avoid route conflict
 */
router.get('/sales/outstanding', salesController.getOutstanding);

/**
 * GET /api/sales/aging-report
 * Get accounts receivable aging report
 * 
 * NOTE: Must be before /:id to avoid route conflict
 */
router.get('/sales/aging-report', salesController.getAgingReport);

/**
 * GET /api/sales/:id
 * Get sales by ID
 */
router.get('/sales/:id', salesController.getById);

/**
 * POST /api/sales
 * Create new sales invoice (draft)
 * Body: {
 *   customer: ObjectId,
 *   invoiceDate: Date,
 *   dueDate: Date,
 *   items: [{
 *     item: ObjectId,
 *     quantity: Number,
 *     unitPrice: Number,
 *     discountAmount: Number
 *   }],
 *   notes: String,
 *   terms: String
 * }
 */
router.post('/sales', salesController.create);

/**
 * PUT /api/sales/:id
 * Update sales invoice (only draft)
 * Body: Same as create
 */
router.put('/sales/:id', salesController.update);

/**
 * DELETE /api/sales/:id
 * Delete sales invoice (only draft)
 */
router.delete('/sales/:id', salesController.delete);

/**
 * POST /api/sales/:id/approve
 * Approve sales (reduce stock + generate jurnal)
 * Body: { approvedBy: String (optional) }
 */
router.post('/sales/:id/approve', salesController.approve);

/**
 * POST /api/sales/:id/complete
 * Mark sales as completed (must be fully paid)
 * Body: none
 */
router.post('/sales/:id/complete', salesController.complete);

/**
 * POST /api/sales/:id/cancel
 * Cancel sales (restore stock if approved)
 * Body: { reason: String (required), cancelledBy: String (optional) }
 */
router.post('/sales/:id/cancel', salesController.cancel);

export default router;