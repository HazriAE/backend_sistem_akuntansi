import { Akun } from "../models/akunSchema.js";
import { JurnalEntry } from "../models/jurnalEntrySchema.js";

class DashboardService {
  /**
   * Get dashboard data dengan filter tanggal
   * @param {Date} startDate - Tanggal mulai
   * @param {Date} endDate - Tanggal akhir
   */
  async getDashboardData(startDate, endDate) {
    try {
      // Parallel execution untuk performa
      const [
        summary,
        revenueTrend,
        assets,
        expenses,
        cashFlow,
        balanceSheet,
        ratios
      ] = await Promise.all([
        this.getSummary(startDate, endDate),
        this.getRevenueTrend(startDate, endDate),
        this.getAssets(),
        this.getExpenses(startDate, endDate),
        this.getCashFlow(startDate, endDate),
        this.getBalanceSheet(),
        this.calculateRatios(startDate, endDate)
      ]);

      return {
        dashboardData: {
          summary,
          revenueTrend,
          assets,
          expenses,
          cashFlow,
          balanceSheet,
          ratios
        }
      };
    } catch (error) {
      throw new Error(`Error getting dashboard data: ${error.message}`);
    }
  }

  /**
   * Summary data utama
   */
  async getSummary(startDate, endDate) {
    // Get semua jurnal dalam periode
    const jurnalEntries = await JurnalEntry.find({
      status: 'posted',
      tanggal: { $gte: startDate, $lte: endDate }
    }).populate('items.akun');

    // Get akun kas dan bank
    const kasBank = await this.getKasBank();

    // Hitung total pendapatan
    const totalPendapatan = await this.getTotalByTipeAkun('pendapatan', startDate, endDate);
    
    // Hitung total beban
    const totalBeban = await this.getTotalByTipeAkun('beban', startDate, endDate);
    
    // Laba bersih
    const labaBersih = totalPendapatan - totalBeban;

    // Get total aset, liabilitas, ekuitas
    const totalAset = await this.getTotalByTipeAkun('aset');
    const totalLiabilitas = await this.getTotalByTipeAkun('liabilitas');
    const totalEkuitas = await this.getTotalByTipeAkun('ekuitas');

    return {
      totalAset,
      totalLiabilitas,
      totalEkuitas,
      totalPendapatan,
      totalBeban,
      labaBersih,
      kasBank,
      periode: {
        dari: startDate,
        sampai: endDate
      }
    };
  }

  /**
   * Revenue trend per bulan
   */
  async getRevenueTrend(startDate, endDate) {
    const akunPendapatan = await Akun.find({ tipeAkun: 'pendapatan', aktif: true });
    const akunIds = akunPendapatan.map(a => a._id);

    const trend = await JurnalEntry.aggregate([
      {
        $match: {
          status: 'posted',
          tanggal: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.akun': { $in: akunIds }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$tanggal' },
            month: { $month: '$tanggal' }
          },
          totalKredit: { $sum: '$items.kredit' },
          totalDebit: { $sum: '$items.debit' }
        }
      },
      {
        $project: {
          _id: 0,
          bulan: '$_id.month',
          tahun: '$_id.year',
          pendapatan: { $subtract: ['$totalKredit', '$totalDebit'] }
        }
      },
      { $sort: { tahun: 1, bulan: 1 } }
    ]);

    return trend.map(t => ({
      periode: `${t.tahun}-${String(t.bulan).padStart(2, '0')}`,
      bulan: t.bulan,
      tahun: t.tahun,
      pendapatan: t.pendapatan
    }));
  }

  /**
   * Assets breakdown
   */
  async getAssets() {
    const akunAset = await Akun.find({ tipeAkun: 'aset', aktif: true });
    const akunIds = akunAset.map(a => a._id);

    const assetData = await JurnalEntry.aggregate([
      { $match: { status: 'posted' } },
      { $unwind: '$items' },
      {
        $match: {
          'items.akun': { $in: akunIds }
        }
      },
      {
        $group: {
          _id: '$items.akun',
          totalDebit: { $sum: '$items.debit' },
          totalKredit: { $sum: '$items.kredit' }
        }
      }
    ]);

    // Populate akun info
    const assets = await Promise.all(
      assetData.map(async (data) => {
        const akun = await Akun.findById(data._id);
        if (!akun) return null;
        
        const saldo = akun.saldoAwal + data.totalDebit - data.totalKredit;
        
        return {
          kodeAkun: akun.kodeAkun,
          namaAkun: akun.namaAkun,
          kategori: akun.kategori,
          saldo
        };
      })
    );

    return assets.filter(a => a !== null && a.saldo > 0);
  }

  /**
   * Expenses breakdown
   */
  async getExpenses(startDate, endDate) {
    const akunBeban = await Akun.find({ tipeAkun: 'beban', aktif: true });
    const akunIds = akunBeban.map(a => a._id);

    const expenseData = await JurnalEntry.aggregate([
      {
        $match: {
          status: 'posted',
          tanggal: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.akun': { $in: akunIds }
        }
      },
      {
        $group: {
          _id: '$items.akun',
          totalDebit: { $sum: '$items.debit' },
          totalKredit: { $sum: '$items.kredit' }
        }
      }
    ]);

    const expenses = await Promise.all(
      expenseData.map(async (data) => {
        const akun = await Akun.findById(data._id);
        if (!akun) return null;
        
        const saldo = data.totalDebit - data.totalKredit;
        
        return {
          kodeAkun: akun.kodeAkun,
          namaAkun: akun.namaAkun,
          kategori: akun.kategori,
          saldo
        };
      })
    );

    return expenses
      .filter(e => e !== null && e.saldo > 0)
      .sort((a, b) => b.saldo - a.saldo);
  }

  /**
   * Cash flow data
   */
  async getCashFlow(startDate, endDate) {
    const kasAkun = await Akun.find({ 
      kategori: { $in: ['kas', 'bank'] }, 
      aktif: true 
    });
    const kasIds = kasAkun.map(a => a._id);

    // Saldo awal kas
    const saldoAwalKas = kasAkun.reduce((sum, akun) => sum + akun.saldoAwal, 0);

    // Kas masuk (kredit untuk kas = kas keluar, debit = kas masuk)
    const kasData = await JurnalEntry.aggregate([
      {
        $match: {
          status: 'posted',
          tanggal: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.akun': { $in: kasIds }
        }
      },
      {
        $group: {
          _id: null,
          totalKasMasuk: { $sum: '$items.debit' },
          totalKasKeluar: { $sum: '$items.kredit' }
        }
      }
    ]);

    const kasMasuk = kasData[0]?.totalKasMasuk || 0;
    const kasKeluar = kasData[0]?.totalKasKeluar || 0;
    const saldoAkhir = saldoAwalKas + kasMasuk - kasKeluar;

    return {
      saldoAwal: saldoAwalKas,
      kasMasuk,
      kasKeluar,
      kasNetto: kasMasuk - kasKeluar,
      saldoAkhir
    };
  }

  /**
   * Balance Sheet (Neraca)
   */
  async getBalanceSheet() {
    const [aset, liabilitas, ekuitas] = await Promise.all([
      this.getBalanceByTipe('aset'),
      this.getBalanceByTipe('liabilitas'),
      this.getBalanceByTipe('ekuitas')
    ]);

    const totalAset = aset.reduce((sum, a) => sum + a.saldo, 0);
    const totalLiabilitas = liabilitas.reduce((sum, l) => sum + l.saldo, 0);
    const totalEkuitas = ekuitas.reduce((sum, e) => sum + e.saldo, 0);

    return {
      aset: {
        items: aset,
        total: totalAset
      },
      liabilitas: {
        items: liabilitas,
        total: totalLiabilitas
      },
      ekuitas: {
        items: ekuitas,
        total: totalEkuitas
      },
      totalLiabilitasDanEkuitas: totalLiabilitas + totalEkuitas,
      balanced: Math.abs(totalAset - (totalLiabilitas + totalEkuitas)) < 0.01
    };
  }

  /**
   * Financial Ratios
   */
  async calculateRatios(startDate, endDate) {
    const [summary, balanceSheet] = await Promise.all([
      this.getSummary(startDate, endDate),
      this.getBalanceSheet()
    ]);

    // Current Ratio (Aset Lancar / Liabilitas Lancar)
    const currentRatio = summary.totalLiabilitas > 0 
      ? (summary.kasBank / summary.totalLiabilitas).toFixed(2)
      : 0;

    // ROA (Return on Assets)
    const roa = summary.totalAset > 0
      ? ((summary.labaBersih / summary.totalAset) * 100).toFixed(2)
      : 0;

    // Profit Margin
    const profitMargin = summary.totalPendapatan > 0
      ? ((summary.labaBersih / summary.totalPendapatan) * 100).toFixed(2)
      : 0;

    // Debt to Equity Ratio
    const debtToEquity = summary.totalEkuitas > 0
      ? (summary.totalLiabilitas / summary.totalEkuitas).toFixed(2)
      : 0;

    // Asset Turnover (untuk perusahaan dagang)
    const assetTurnover = summary.totalAset > 0
      ? (summary.totalPendapatan / summary.totalAset).toFixed(2)
      : 0;

    return {
      currentRatio: parseFloat(currentRatio),
      roa: parseFloat(roa),
      profitMargin: parseFloat(profitMargin),
      debtToEquity: parseFloat(debtToEquity),
      assetTurnover: parseFloat(assetTurnover)
    };
  }

  // ========== HELPER METHODS ==========

  async getTotalByTipeAkun(tipeAkun, startDate = null, endDate = null) {
    const akuns = await Akun.find({ tipeAkun, aktif: true });
    const akunIds = akuns.map(a => a._id);

    const matchQuery = {
      status: 'posted',
      'items.akun': { $in: akunIds }
    };

    if (startDate && endDate) {
      matchQuery.tanggal = { $gte: startDate, $lte: endDate };
    }

    const result = await JurnalEntry.aggregate([
      { $match: { status: 'posted', ...(startDate && endDate ? { tanggal: { $gte: startDate, $lte: endDate } } : {}) } },
      { $unwind: '$items' },
      { $match: { 'items.akun': { $in: akunIds } } },
      {
        $group: {
          _id: null,
          totalDebit: { $sum: '$items.debit' },
          totalKredit: { $sum: '$items.kredit' }
        }
      }
    ]);

    if (result.length === 0) return 0;

    const saldoAwal = akuns.reduce((sum, a) => sum + a.saldoAwal, 0);
    
    // Untuk aset dan beban: saldo normal debit
    if (tipeAkun === 'aset' || tipeAkun === 'beban') {
      return saldoAwal + result[0].totalDebit - result[0].totalKredit;
    }
    
    // Untuk liabilitas, ekuitas, pendapatan: saldo normal kredit
    return saldoAwal + result[0].totalKredit - result[0].totalDebit;
  }

  async getKasBank() {
    const kasAkun = await Akun.find({ 
      kategori: { $in: ['kas', 'bank'] }, 
      aktif: true 
    });
    const kasIds = kasAkun.map(a => a._id);

    const kasData = await JurnalEntry.aggregate([
      { $match: { status: 'posted' } },
      { $unwind: '$items' },
      { $match: { 'items.akun': { $in: kasIds } } },
      {
        $group: {
          _id: null,
          totalDebit: { $sum: '$items.debit' },
          totalKredit: { $sum: '$items.kredit' }
        }
      }
    ]);

    const saldoAwal = kasAkun.reduce((sum, a) => sum + a.saldoAwal, 0);
    const debit = kasData[0]?.totalDebit || 0;
    const kredit = kasData[0]?.totalKredit || 0;

    return saldoAwal + debit - kredit;
  }

  async getBalanceByTipe(tipeAkun) {
    const akuns = await Akun.find({ tipeAkun, aktif: true });
    const akunIds = akuns.map(a => a._id);

    const balanceData = await JurnalEntry.aggregate([
      { $match: { status: 'posted' } },
      { $unwind: '$items' },
      { $match: { 'items.akun': { $in: akunIds } } },
      {
        $group: {
          _id: '$items.akun',
          totalDebit: { $sum: '$items.debit' },
          totalKredit: { $sum: '$items.kredit' }
        }
      }
    ]);

    const balances = await Promise.all(
      balanceData.map(async (data) => {
        const akun = await Akun.findById(data._id);
        if (!akun) return null;

        let saldo;
        if (tipeAkun === 'aset' || tipeAkun === 'beban') {
          saldo = akun.saldoAwal + data.totalDebit - data.totalKredit;
        } else {
          saldo = akun.saldoAwal + data.totalKredit - data.totalDebit;
        }

        return {
          kodeAkun: akun.kodeAkun,
          namaAkun: akun.namaAkun,
          kategori: akun.kategori,
          saldo
        };
      })
    );

    return balances.filter(b => b !== null);
  }
}

export default new DashboardService();