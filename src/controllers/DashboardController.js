import dashboardService from "../service/dashoardService.js";

class DashboardController {
  /**
   * GET /api/dashboard
   * Get complete dashboard data
   */
  async getDashboard(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // Default periode: bulan ini
      const start = startDate 
        ? new Date(startDate) 
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      
      const end = endDate 
        ? new Date(endDate) 
        : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

      const dashboardData = await dashboardService.getDashboardData(start, end);

      res.status(200).json({
        success: true,
        message: 'Dashboard data retrieved successfully',
        data: dashboardData
      });
    } catch (error) {
      console.error('Error in getDashboard:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get dashboard data',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * GET /api/dashboard/summary
   * Get summary only
   */
  async getSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate 
        ? new Date(startDate) 
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      
      const end = endDate 
        ? new Date(endDate) 
        : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

      const summary = await dashboardService.getSummary(start, end);

      res.status(200).json({
        success: true,
        message: 'Summary retrieved successfully',
        data: { summary }
      });
    } catch (error) {
      console.error('Error in getSummary:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get summary',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * GET /api/dashboard/revenue-trend
   * Get revenue trend
   */
  async getRevenueTrend(req, res) {
    try {
      const { startDate, endDate } = req.query;

      // Default: 12 bulan terakhir
      const end = endDate 
        ? new Date(endDate) 
        : new Date();
      
      const start = startDate 
        ? new Date(startDate) 
        : new Date(end.getFullYear(), end.getMonth() - 11, 1);

      const revenueTrend = await dashboardService.getRevenueTrend(start, end);

      res.status(200).json({
        success: true,
        message: 'Revenue trend retrieved successfully',
        data: { revenueTrend }
      });
    } catch (error) {
      console.error('Error in getRevenueTrend:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get revenue trend',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * GET /api/dashboard/assets
   * Get assets breakdown
   */
  async getAssets(req, res) {
    try {
      const assets = await dashboardService.getAssets();

      res.status(200).json({
        success: true,
        message: 'Assets retrieved successfully',
        data: { assets }
      });
    } catch (error) {
      console.error('Error in getAssets:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get assets',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * GET /api/dashboard/expenses
   * Get expenses breakdown
   */
  async getExpenses(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate 
        ? new Date(startDate) 
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      
      const end = endDate 
        ? new Date(endDate) 
        : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

      const expenses = await dashboardService.getExpenses(start, end);

      res.status(200).json({
        success: true,
        message: 'Expenses retrieved successfully',
        data: { expenses }
      });
    } catch (error) {
      console.error('Error in getExpenses:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get expenses',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * GET /api/dashboard/cash-flow
   * Get cash flow data
   */
  async getCashFlow(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate 
        ? new Date(startDate) 
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      
      const end = endDate 
        ? new Date(endDate) 
        : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

      const cashFlow = await dashboardService.getCashFlow(start, end);

      res.status(200).json({
        success: true,
        message: 'Cash flow retrieved successfully',
        data: { cashFlow }
      });
    } catch (error) {
      console.error('Error in getCashFlow:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get cash flow',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * GET /api/dashboard/balance-sheet
   * Get balance sheet
   */
  async getBalanceSheet(req, res) {
    try {
      const balanceSheet = await dashboardService.getBalanceSheet();

      res.status(200).json({
        success: true,
        message: 'Balance sheet retrieved successfully',
        data: { balanceSheet }
      });
    } catch (error) {
      console.error('Error in getBalanceSheet:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get balance sheet',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * GET /api/dashboard/ratios
   * Get financial ratios
   */
  async getRatios(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate 
        ? new Date(startDate) 
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      
      const end = endDate 
        ? new Date(endDate) 
        : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

      const ratios = await dashboardService.calculateRatios(start, end);

      res.status(200).json({
        success: true,
        message: 'Financial ratios retrieved successfully',
        data: { ratios }
      });
    } catch (error) {
      console.error('Error in getRatios:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get ratios',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

export default new DashboardController();