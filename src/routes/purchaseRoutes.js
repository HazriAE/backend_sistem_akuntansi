// ==================== FILE: src/routes/purchaseRoutes.js ====================

import express from 'express';
import purchaseController from '../controllers/purchaseController.js';

const router = express.Router();

// ==================== PURCHASE ROUTES ====================

/**
 * GET /api/purchase
 * Get all purchases
 * Query params: ?supplier=xxx&status=draft&paymentStatus=unpaid&startDate=2024-01-01&endDate=2024-12-31
 */
router.get('/purchase', purchaseController.getAll);

/**
 * GET /api/purchase/outstanding
 * Get outstanding purchases (unpaid/partial)
 * Query params: ?supplierId=xxx
 * 
 * NOTE: Must be before /:id to avoid route conflict
 */
router.get('/purchase/outstanding', purchaseController.getOutstanding);

/**
 * GET /api/purchase/aging-report
 * Get accounts payable aging report
 * 
 * NOTE: Must be before /:id to avoid route conflict
 */
router.get('/purchase/aging-report', purchaseController.getAgingReport);

/**
 * GET /api/purchase/:id
 * Get purchase by ID
 */
router.get('/purchase/:id', purchaseController.getById);

/**
 * POST /api/purchase
 * Create new purchase (draft)
 * Body: {
 *   supplier: ObjectId,
 *   purchaseDate: Date,
 *   dueDate: Date,
 *   items: [{
 *     item: ObjectId,
 *     quantity: Number,
 *     unitPrice: Number,
 *     discountAmount: Number
 *   }],
 *   notes: String
 * }
 */
router.post('/purchase', purchaseController.create);

/**
 * PUT /api/purchase/:id
 * Update purchase (only draft)
 * Body: Same as create
 */
router.put('/purchase/:id', purchaseController.update);

/**
 * DELETE /api/purchase/:id
 * Delete purchase (only draft)
 */
router.delete('/purchase/:id', purchaseController.delete);

/**
 * POST /api/purchase/:id/approve
 * Approve purchase (add stock + generate jurnal)
 * Body: { approvedBy: String (optional) }
 */
router.post('/purchase/:id/approve', purchaseController.approve);

/**
 * POST /api/purchase/:id/receive
 * Mark purchase as received
 * Body: { receivedBy: String (optional) }
 */
router.post('/purchase/:id/receive', purchaseController.receive);

/**
 * POST /api/purchase/:id/cancel
 * Cancel purchase (reverse stock if approved)
 * Body: { reason: String (required), cancelledBy: String (optional) }
 */
router.post('/purchase/:id/cancel', purchaseController.cancel);

export default router;