// ==================== FILE: src/controllers/salesController.js ====================

import { salesService } from '../service/salesService.js';
import { ValidationError } from '../utils/errors.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const salesController = {
  /**
   * @route   POST /api/sales
   * @desc    Create new sales invoice
   * @access  Private
   */
  createSales: asyncHandler(async (req, res) => {
    const { customer, items, invoiceDate, dueDate, taxRate, notes, referenceNumber } = req.body;

    // Validation
    if (!customer) {
      throw new ValidationError('Customer is required');
    }
    if (!items || items.length === 0) {
      throw new ValidationError('At least one item is required');
    }
    if (!dueDate) {
      throw new ValidationError('Due date is required');
    }

    const salesData = {
      customer,
      items,
      invoiceDate: invoiceDate || new Date(),
      dueDate,
      taxRate: taxRate || 11,
      notes,
      referenceNumber
    };

    const sales = await salesService.createSales(salesData, req.user?.id || 'system');

    res.status(201).json({
      success: true,
      message: 'Sales invoice created successfully',
      data: sales
    });
  }),

  /**
   * @route   PUT /api/sales/:id/approve
   * @desc    Approve sales invoice
   * @access  Private (Manager/Admin)
   */
  approveSales: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const sales = await salesService.approveSales(id, req.user?.id || 'system');

    res.json({
      success: true,
      message: 'Sales invoice approved successfully',
      data: sales
    });
  }),

  /**
   * @route   PUT /api/sales/:id/complete
   * @desc    Mark sales as completed
   * @access  Private
   */
  completeSales: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const sales = await salesService.completeSales(id);

    res.json({
      success: true,
      message: 'Sales marked as completed',
      data: sales
    });
  }),

  /**
   * @route   PUT /api/sales/:id/cancel
   * @desc    Cancel sales invoice
   * @access  Private (Manager/Admin)
   */
  cancelSales: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      throw new ValidationError('Cancellation reason is required');
    }

    const sales = await salesService.cancelSales(id, reason, req.user?.id || 'system');

    res.json({
      success: true,
      message: 'Sales invoice cancelled successfully',
      data: sales
    });
  }),

  /**
   * @route   PUT /api/sales/:id
   * @desc    Update sales invoice (draft only)
   * @access  Private
   */
  updateSales: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const sales = await salesService.updateSales(id, updateData);

    res.json({
      success: true,
      message: 'Sales invoice updated successfully',
      data: sales
    });
  }),

  /**
   * @route   DELETE /api/sales/:id
   * @desc    Delete sales invoice (draft only)
   * @access  Private
   */
  deleteSales: asyncHandler(async (req, res) => {
    const { id } = req.params;

    await salesService.deleteSales(id);

    res.json({
      success: true,
      message: 'Sales invoice deleted successfully'
    });
  }),

  /**
   * @route   GET /api/sales/:id
   * @desc    Get sales invoice by ID
   * @access  Private
   */
  getSalesById: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const sales = await salesService.getSalesById(id);

    res.json({
      success: true,
      data: sales
    });
  }),

  /**
   * @route   GET /api/sales
   * @desc    Get all sales invoices with filters
   * @access  Private
   */
  getAllSales: asyncHandler(async (req, res) => {
    const { customer, status, paymentStatus, startDate, endDate } = req.query;

    const filters = {};
    if (customer) filters.customer = customer;
    if (status) filters.status = status;
    if (paymentStatus) filters.paymentStatus = paymentStatus;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const sales = await salesService.getAllSales(filters);

    res.json({
      success: true,
      count: sales.length,
      data: sales
    });
  }),

  /**
   * @route   GET /api/sales/outstanding
   * @desc    Get outstanding sales (unpaid/partial)
   * @access  Private
   */
  getOutstandingSales: asyncHandler(async (req, res) => {
    const { customerId } = req.query;

    const sales = await salesService.getOutstandingSales(customerId || null);

    const totalOutstanding = sales.reduce((sum, s) => sum + s.remainingBalance, 0);

    res.json({
      success: true,
      count: sales.length,
      totalOutstanding,
      data: sales
    });
  }),

  /**
   * @route   GET /api/sales/aging-report
   * @desc    Get aging report for AR
   * @access  Private
   */
  getAgingReport: asyncHandler(async (req, res) => {
    const report = await salesService.getAgingReport();

    res.json({
      success: true,
      data: report
    });
  }),

  /**
   * @route   POST /api/sales/:id/payment
   * @desc    Record payment for sales
   * @access  Private
   */
  recordPayment: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { amount, paymentMethod, paymentDate, note } = req.body;

    if (!amount || amount <= 0) {
      throw new ValidationError('Valid payment amount is required');
    }
    if (!paymentMethod) {
      throw new ValidationError('Payment method is required');
    }

    const sales = await salesService.recordPayment(
      id,
      amount,
      paymentMethod,
      paymentDate ? new Date(paymentDate) : new Date(),
      note || ''
    );

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: sales
    });
  }),

  /**
   * @route   GET /api/sales/performance
   * @desc    Get sales performance report
   * @access  Private
   */
  getPerformanceReport: asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    const report = await salesService.getSalesPerformance(startDate, endDate);

    res.json({
      success: true,
      data: report
    });
  })
};