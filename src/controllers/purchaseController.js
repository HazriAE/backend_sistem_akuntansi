// ==================== FILE: src/controllers/purchaseController.js ====================

import { purchaseService } from "../service/purchaseService.js";

const purchaseController = {
  /**
   * GET /api/purchase
   * Get all purchases with optional filters
   */
  getAll: async (req, res) => {
    try {
      const { supplier, status, paymentStatus, startDate, endDate } = req.query;

      const filters = {};
      if (supplier) filters.supplier = supplier;
      if (status) filters.status = status;
      if (paymentStatus) filters.paymentStatus = paymentStatus;
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const purchases = await purchaseService.getAllPurchases(filters);

      res.json({
        success: true,
        count: purchases.length,
        data: purchases
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * GET /api/purchase/:id
   * Get purchase by ID
   */
  getById: async (req, res) => {
    try {
      const purchase = await purchaseService.getPurchaseById(req.params.id);

      res.json({
        success: true,
        data: purchase
      });
    } catch (error) {
      const statusCode = error.message === 'Purchase not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * POST /api/purchase
   * Create new purchase (draft)
   */
  create: async (req, res) => {
    try {
      const createdBy = req.body.createdBy || req.user?.username || 'system';

      const purchase = await purchaseService.createPurchase(req.body, createdBy);

      res.status(201).json({
        success: true,
        message: 'Purchase created successfully',
        data: purchase
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * PUT /api/purchase/:id
   * Update purchase (only draft)
   */
  update: async (req, res) => {
    try {
      const purchase = await purchaseService.updatePurchase(req.params.id, req.body);

      res.json({
        success: true,
        message: 'Purchase updated successfully',
        data: purchase
      });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * DELETE /api/purchase/:id
   * Delete purchase (only draft)
   */
  delete: async (req, res) => {
    try {
      const result = await purchaseService.deletePurchase(req.params.id);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * POST /api/purchase/:id/approve
   * Approve purchase (add stock + generate jurnal)
   */
  approve: async (req, res) => {
    try {
      const approvedBy = req.body.approvedBy || req.user?.username || 'system';

      const purchase = await purchaseService.approvePurchase(req.params.id, approvedBy);

      res.json({
        success: true,
        message: 'Purchase approved successfully. Stock has been added and journal entry created.',
        data: purchase
      });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * POST /api/purchase/:id/receive
   * Mark purchase as received
   */
  receive: async (req, res) => {
    try {
      const receivedBy = req.body.receivedBy || req.user?.username || 'system';

      const purchase = await purchaseService.receivePurchase(req.params.id, receivedBy);

      res.json({
        success: true,
        message: 'Purchase marked as received',
        data: purchase
      });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * POST /api/purchase/:id/cancel
   * Cancel purchase (reverse stock if approved)
   */
  cancel: async (req, res) => {
    try {
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Cancellation reason is required'
        });
      }

      const cancelledBy = req.body.cancelledBy || req.user?.username || 'system';

      const purchase = await purchaseService.cancelPurchase(
        req.params.id,
        reason,
        cancelledBy
      );

      res.json({
        success: true,
        message: 'Purchase cancelled successfully',
        data: purchase
      });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * GET /api/purchase/outstanding
   * Get outstanding purchases (unpaid/partial)
   */
  getOutstanding: async (req, res) => {
    try {
      const { supplierId } = req.query;

      const purchases = await purchaseService.getOutstandingPurchases(supplierId);

      // Calculate totals
      const totalOutstanding = purchases.reduce((sum, p) => sum + p.remainingBalance, 0);

      res.json({
        success: true,
        count: purchases.length,
        totalOutstanding,
        data: purchases
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  /**
   * GET /api/purchase/aging-report
   * Get accounts payable aging report
   */
  getAgingReport: async (req, res) => {
    try {
      const report = await purchaseService.getAgingReport();

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

export default purchaseController;