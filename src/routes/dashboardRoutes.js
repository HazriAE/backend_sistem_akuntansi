import express from 'express';
import dashboardController from  '../controllers/DashboardController.js';

const router = express.Router();

/**
 * @route   GET /api/dashboard
 * @desc    Get complete dashboard data
 * @access  Public (tambahkan auth middleware jika perlu)
 * @query   startDate (optional) - Format: YYYY-MM-DD
 * @query   endDate (optional) - Format: YYYY-MM-DD
 */
router.get('/', dashboardController.getDashboard);

/**
 * @route   GET /api/dashboard/summary
 * @desc    Get summary data only
 * @access  Public
 * @query   startDate, endDate
 */
router.get('/summary', dashboardController.getSummary);

/**
 * @route   GET /api/dashboard/revenue-trend
 * @desc    Get revenue trend (default: 12 months)
 * @access  Public
 * @query   startDate, endDate
 */
router.get('/revenue-trend', dashboardController.getRevenueTrend);

/**
 * @route   GET /api/dashboard/assets
 * @desc    Get assets breakdown
 * @access  Public
 */
router.get('/assets', dashboardController.getAssets);

/**
 * @route   GET /api/dashboard/expenses
 * @desc    Get expenses breakdown
 * @access  Public
 * @query   startDate, endDate
 */
router.get('/expenses', dashboardController.getExpenses);

/**
 * @route   GET /api/dashboard/cash-flow
 * @desc    Get cash flow data
 * @access  Public
 * @query   startDate, endDate
 */
router.get('/cash-flow', dashboardController.getCashFlow);

/**
 * @route   GET /api/dashboard/balance-sheet
 * @desc    Get balance sheet (neraca)
 * @access  Public
 */
router.get('/balance-sheet', dashboardController.getBalanceSheet);

/**
 * @route   GET /api/dashboard/ratios
 * @desc    Get financial ratios
 * @access  Public
 * @query   startDate, endDate
 */
router.get('/ratios', dashboardController.getRatios);

export default router;