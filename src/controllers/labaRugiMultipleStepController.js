// ==================== FILE: src/controllers/laporanController.js ====================
// Laporan Laba Rugi Multiple Step - Metode Perpetual (Fixed)

import { Akun } from "../models/akunSchema.js";
import { JurnalEntry } from "../models/jurnalEntrySchema.js";

/**
 * Laporan Laba Rugi - Multiple Step (Perusahaan Dagang - Metode Perpetual)
 * 
 * METODE PERPETUAL:
 * - HPP langsung tercatat saat penjualan via akun "Beban Pokok Penjualan" (5-1001)
 * - TIDAK perlu hitung persediaan awal/akhir
 * - HPP = Total dari akun 5-1001 (Beban Pokok Penjualan)
 */
const labaRugiMultipleStepController = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const periodeAwal = startDate ? new Date(startDate) : new Date(2025, 0, 2);
    const periodeAkhir = endDate ? new Date(endDate) : new Date(2025, 2, 32);

    const filter = {
      status: 'posted',
      tanggal: {
        $gte: periodeAwal,
        $lte: periodeAkhir
      }
    };

    // ==================== 1. PENJUALAN BERSIH ====================
    const penjualanData = await hitungPenjualanBersih(filter);

    // ==================== 2. HPP (dari akun 5-1001) ====================
    const hpp = await hitungHPPPerpetual(filter);

    // ==================== 3. LABA KOTOR ====================
    const labaKotor = penjualanData.penjualanBersih - hpp.totalHPP;

    // ==================== 4. BEBAN USAHA ====================
    const bebanUsaha = await hitungBebanUsaha(filter);

    // ==================== 5. LABA USAHA ====================
    const labaUsaha = labaKotor - bebanUsaha.total;

    // ==================== 6. PENDAPATAN & BEBAN LAIN-LAIN ====================
    const lainLain = await hitungPendapatanBebanLain(filter);

    // ==================== 7. LABA SEBELUM PAJAK ====================
    const labaSebelumPajak = labaUsaha + lainLain.pendapatanLain - lainLain.bebanLain - lainLain.bebanKeuangan;

    // ==================== 8. BEBAN PAJAK ====================
    const pajak = await hitungBebanPajak(filter);

    // ==================== 9. LABA BERSIH ====================
    const labaBersih = labaSebelumPajak - pajak.total;

    // ==================== 10. PENGHASILAN KOMPREHENSIF LAIN (OCI) ====================
    const oci = await hitungOCI(filter);

    // ==================== 11. TOTAL LABA KOMPREHENSIF ====================
    const totalLabaKomprehensif = labaBersih + oci.total;

    res.json({
      success: true,
      data: {
        namaPerusahaan: "AZKO Hardware",
        jenisLaporan: "Laporan Laba Rugi",
        metode: "Perpetual - Multiple Step",
        periode: {
          dari: periodeAwal.toISOString().split('T')[0],
          sampai: periodeAkhir.toISOString().split('T')[0]
        },
        
        // ========== PENDAPATAN ==========
        penjualan: {
          penjualanBersih: penjualanData.penjualanBersih,
          penjualanKonsinyasi: penjualanData.penjualanKonsinyasi,
          totalPenjualan: penjualanData.totalPenjualan,
          detail: penjualanData.detail
        },
        
        // ========== BEBAN POKOK PENJUALAN (HPP) ==========
        bebanPokokPenjualan: {
          total: hpp.totalHPP,
          detail: hpp.detail
        },
        
        // ========== LABA KOTOR ==========
        labaKotor: {
          jumlah: labaKotor,
          persentase: penjualanData.totalPenjualan > 0 
            ? ((labaKotor / penjualanData.totalPenjualan) * 100).toFixed(2) + '%'
            : '0.00%'
        },
        
        // ========== BEBAN USAHA ==========
        bebanUsaha: {
          total: bebanUsaha.total,
          detail: bebanUsaha.detail
        },
        
        // ========== LABA USAHA ==========
        labaUsaha: {
          jumlah: labaUsaha,
          persentase: penjualanData.totalPenjualan > 0 
            ? ((labaUsaha / penjualanData.totalPenjualan) * 100).toFixed(2) + '%'
            : '0.00%'
        },
        
        // ========== PENDAPATAN & BEBAN LAIN ==========
        pendapatanLain: {
          total: lainLain.pendapatanLain,
          detail: lainLain.pendapatanLainDetail
        },
        bebanLain: {
          total: lainLain.bebanLain,
          detail: lainLain.bebanLainDetail
        },
        bebanKeuangan: {
          total: lainLain.bebanKeuangan,
          detail: lainLain.bebanKeuanganDetail
        },
        bagianRugiEntitasAsosiasi: {
          total: lainLain.bagianRugiAsosiasi,
          detail: lainLain.bagianRugiAsosiasiDetail
        },
        
        // ========== LABA SEBELUM PAJAK ==========
        labaSebelumPajak: {
          jumlah: labaSebelumPajak,
          persentase: penjualanData.totalPenjualan > 0 
            ? ((labaSebelumPajak / penjualanData.totalPenjualan) * 100).toFixed(2) + '%'
            : '0.00%'
        },
        
        // ========== BEBAN PAJAK ==========
        bebanPajak: {
          total: pajak.total,
          detail: pajak.detail
        },
        
        // ========== LABA BERSIH ==========
        labaBersih: {
          jumlah: labaBersih,
          persentase: penjualanData.totalPenjualan > 0 
            ? ((labaBersih / penjualanData.totalPenjualan) * 100).toFixed(2) + '%'
            : '0.00%'
        },
        
        // ========== PENGHASILAN KOMPREHENSIF LAIN (OCI) ==========
        penghasilanKomprehensifLain: {
          total: oci.total,
          detail: oci.detail
        },
        
        // ========== TOTAL LABA KOMPREHENSIF ==========
        totalLabaKomprehensif: {
          jumlah: totalLabaKomprehensif
        },
        
        // ========== SUMMARY & RATIOS ==========
        summary: {
          penjualanBersih: penjualanData.totalPenjualan,
          bebanPokokPenjualan: hpp.totalHPP,
          labaKotor: labaKotor,
          bebanUsaha: bebanUsaha.total,
          labaUsaha: labaUsaha,
          labaSebelumPajak: labaSebelumPajak,
          bebanPajak: pajak.total,
          labaBersih: labaBersih,
          totalLabaKomprehensif: totalLabaKomprehensif
        },
        
        ratios: {
          grossProfitMargin: penjualanData.totalPenjualan > 0 
            ? ((labaKotor / penjualanData.totalPenjualan) * 100).toFixed(2) + '%'
            : '0.00%',
          operatingProfitMargin: penjualanData.totalPenjualan > 0 
            ? ((labaUsaha / penjualanData.totalPenjualan) * 100).toFixed(2) + '%'
            : '0.00%',
          netProfitMargin: penjualanData.totalPenjualan > 0 
            ? ((labaBersih / penjualanData.totalPenjualan) * 100).toFixed(2) + '%'
            : '0.00%',
          taxRate: labaSebelumPajak > 0
            ? ((pajak.total / labaSebelumPajak) * 100).toFixed(2) + '%'
            : '0.00%'
        }
      }
    });
  } catch (error) {
    console.error('Error generating Laba Rugi:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Hitung Penjualan Bersih (dari akun 4-1001 dan 4-1002)
 */
async function hitungPenjualanBersih(filter) {
  // Akun 4-1001: Penjualan Bersih
  const penjualanBersihAkun = await Akun.findOne({ 
    kodeAkun: '4-1001',
    aktif: true 
  });

  // Akun 4-1002: Penjualan Konsinyasi - Bersih
  const penjualanKonsinyasiAkun = await Akun.findOne({ 
    kodeAkun: '4-1002',
    aktif: true 
  });

  let penjualanBersih = 0;
  let penjualanKonsinyasi = 0;
  const detail = [];

  // Hitung Penjualan Bersih (4-1001)
  if (penjualanBersihAkun) {
    const jurnal = await JurnalEntry.find({
      status: filter.status,
      tanggal: filter.tanggal,
      'items.akun': penjualanBersihAkun._id
    });

    jurnal.forEach(j => {
      j.items.forEach(item => {
        if (item.akun.toString() === penjualanBersihAkun._id.toString()) {
          // Penjualan = Kredit - Debit
          penjualanBersih += (item.kredit || 0) - (item.debit || 0);
        }
      });
    });

    if (penjualanBersih !== 0) {
      detail.push({
        kodeAkun: penjualanBersihAkun.kodeAkun,
        namaAkun: penjualanBersihAkun.namaAkun,
        jumlah: penjualanBersih
      });
    }
  }

  // Hitung Penjualan Konsinyasi (4-1002)
  if (penjualanKonsinyasiAkun) {
    const jurnal = await JurnalEntry.find({
      status: filter.status,
      tanggal: filter.tanggal,
      'items.akun': penjualanKonsinyasiAkun._id
    });

    jurnal.forEach(j => {
      j.items.forEach(item => {
        if (item.akun.toString() === penjualanKonsinyasiAkun._id.toString()) {
          penjualanKonsinyasi += (item.kredit || 0) - (item.debit || 0);
        }
      });
    });

    if (penjualanKonsinyasi !== 0) {
      detail.push({
        kodeAkun: penjualanKonsinyasiAkun.kodeAkun,
        namaAkun: penjualanKonsinyasiAkun.namaAkun,
        jumlah: penjualanKonsinyasi
      });
    }
  }

  const totalPenjualan = penjualanBersih + penjualanKonsinyasi;

  return {
    penjualanBersih,
    penjualanKonsinyasi,
    totalPenjualan,
    detail
  };
}

/**
 * Hitung HPP - Metode Perpetual
 * Langsung dari akun 5-1001 (Beban Pokok Penjualan)
 */
async function hitungHPPPerpetual(filter) {
  // Akun 5-1001: Beban Pokok Penjualan
  const hppAkun = await Akun.findOne({
    kodeAkun: '5-1001',
    aktif: true
  });

  let totalHPP = 0;
  const detail = [];

  if (hppAkun) {
    const jurnal = await JurnalEntry.find({
      status: filter.status,
      tanggal: filter.tanggal,
      'items.akun': hppAkun._id
    });

    jurnal.forEach(j => {
      j.items.forEach(item => {
        if (item.akun.toString() === hppAkun._id.toString()) {
          // HPP = Debit - Kredit
          totalHPP += (item.debit || 0) - (item.kredit || 0);
        }
      });
    });

    detail.push({
      kodeAkun: hppAkun.kodeAkun,
      namaAkun: hppAkun.namaAkun,
      jumlah: totalHPP
    });
  }

  return {
    totalHPP,
    detail
  };
}

/**
 * Hitung Beban Usaha (dari akun 5-1002)
 */
async function hitungBebanUsaha(filter) {
  // Akun 5-1002: Beban Usaha
  const bebanUsahaAkun = await Akun.findOne({
    kodeAkun: '5-1002',
    aktif: true
  });

  let total = 0;
  const detail = [];

  if (bebanUsahaAkun) {
    const jurnal = await JurnalEntry.find({
      status: filter.status,
      tanggal: filter.tanggal,
      'items.akun': bebanUsahaAkun._id
    });

    jurnal.forEach(j => {
      j.items.forEach(item => {
        if (item.akun.toString() === bebanUsahaAkun._id.toString()) {
          // Beban = Debit - Kredit
          total += (item.debit || 0) - (item.kredit || 0);
        }
      });
    });

    detail.push({
      kodeAkun: bebanUsahaAkun.kodeAkun,
      namaAkun: bebanUsahaAkun.namaAkun,
      jumlah: total
    });
  }

  return { total, detail };
}

/**
 * Hitung Pendapatan & Beban Lain-lain
 */
async function hitungPendapatanBebanLain(filter) {
  // 4-1003: Pendapatan Lain-lain
  const pendapatanLainAkun = await Akun.findOne({
    kodeAkun: '4-1003',
    aktif: true
  });

  // 5-1003: Beban Lain-lain
  const bebanLainAkun = await Akun.findOne({
    kodeAkun: '5-1003',
    aktif: true
  });

  // 5-1005: Bagian atas Rugi Entitas Asosiasi
  const bagianRugiAsosiasiAkun = await Akun.findOne({
    kodeAkun: '5-1005',
    aktif: true
  });

  // 5-1006: Beban Keuangan - Bersih
  const bebanKeuanganAkun = await Akun.findOne({
    kodeAkun: '5-1006',
    aktif: true
  });

  let pendapatanLain = 0;
  let bebanLain = 0;
  let bebanKeuangan = 0;
  let bagianRugiAsosiasi = 0;

  const pendapatanLainDetail = [];
  const bebanLainDetail = [];
  const bebanKeuanganDetail = [];
  const bagianRugiAsosiasiDetail = [];

  // Hitung Pendapatan Lain (4-1003)
  if (pendapatanLainAkun) {
    const jurnal = await JurnalEntry.find({
      status: filter.status,
      tanggal: filter.tanggal,
      'items.akun': pendapatanLainAkun._id
    });

    jurnal.forEach(j => {
      j.items.forEach(item => {
        if (item.akun.toString() === pendapatanLainAkun._id.toString()) {
          pendapatanLain += (item.kredit || 0) - (item.debit || 0);
        }
      });
    });

    if (pendapatanLain !== 0) {
      pendapatanLainDetail.push({
        kodeAkun: pendapatanLainAkun.kodeAkun,
        namaAkun: pendapatanLainAkun.namaAkun,
        jumlah: pendapatanLain
      });
    }
  }

  // Hitung Beban Lain (5-1003)
  if (bebanLainAkun) {
    const jurnal = await JurnalEntry.find({
      status: filter.status,
      tanggal: filter.tanggal,
      'items.akun': bebanLainAkun._id
    });

    jurnal.forEach(j => {
      j.items.forEach(item => {
        if (item.akun.toString() === bebanLainAkun._id.toString()) {
          bebanLain += (item.debit || 0) - (item.kredit || 0);
        }
      });
    });

    if (bebanLain !== 0) {
      bebanLainDetail.push({
        kodeAkun: bebanLainAkun.kodeAkun,
        namaAkun: bebanLainAkun.namaAkun,
        jumlah: bebanLain
      });
    }
  }

  // Hitung Bagian Rugi Entitas Asosiasi (5-1005)
  if (bagianRugiAsosiasiAkun) {
    const jurnal = await JurnalEntry.find({
      status: filter.status,
      tanggal: filter.tanggal,
      'items.akun': bagianRugiAsosiasiAkun._id
    });

    jurnal.forEach(j => {
      j.items.forEach(item => {
        if (item.akun.toString() === bagianRugiAsosiasiAkun._id.toString()) {
          bagianRugiAsosiasi += (item.debit || 0) - (item.kredit || 0);
        }
      });
    });

    if (bagianRugiAsosiasi !== 0) {
      bagianRugiAsosiasiDetail.push({
        kodeAkun: bagianRugiAsosiasiAkun.kodeAkun,
        namaAkun: bagianRugiAsosiasiAkun.namaAkun,
        jumlah: bagianRugiAsosiasi
      });
    }
  }

  // Hitung Beban Keuangan (5-1006)
  if (bebanKeuanganAkun) {
    const jurnal = await JurnalEntry.find({
      status: filter.status,
      tanggal: filter.tanggal,
      'items.akun': bebanKeuanganAkun._id
    });

    jurnal.forEach(j => {
      j.items.forEach(item => {
        if (item.akun.toString() === bebanKeuanganAkun._id.toString()) {
          bebanKeuangan += (item.debit || 0) - (item.kredit || 0);
        }
      });
    });

    if (bebanKeuangan !== 0) {
      bebanKeuanganDetail.push({
        kodeAkun: bebanKeuanganAkun.kodeAkun,
        namaAkun: bebanKeuanganAkun.namaAkun,
        jumlah: bebanKeuangan
      });
    }
  }

  return {
    pendapatanLain,
    bebanLain,
    bebanKeuangan,
    bagianRugiAsosiasi,
    pendapatanLainDetail,
    bebanLainDetail,
    bebanKeuanganDetail,
    bagianRugiAsosiasiDetail
  };
}

/**
 * Hitung Beban Pajak (5-1004 dan 5-1007)
 */
async function hitungBebanPajak(filter) {
  // 5-1004: Beban Pajak Final
  // 5-1007: Beban Pajak Penghasilan
  const pajakAkun = await Akun.find({
    kodeAkun: { $in: ['5-1004', '5-1007'] },
    aktif: true
  });

  const detail = [];
  let total = 0;

  for (let akun of pajakAkun) {
    const jurnal = await JurnalEntry.find({
      status: filter.status,
      tanggal: filter.tanggal,
      'items.akun': akun._id
    });

    let jumlah = 0;
    jurnal.forEach(j => {
      j.items.forEach(item => {
        if (item.akun.toString() === akun._id.toString()) {
          jumlah += (item.debit || 0) - (item.kredit || 0);
        }
      });
    });

    if (jumlah !== 0) {
      detail.push({
        kodeAkun: akun.kodeAkun,
        namaAkun: akun.namaAkun,
        jumlah
      });
      total += jumlah;
    }
  }

  return { total, detail };
}

/**
 * Hitung Penghasilan Komprehensif Lain (OCI) - 5-1008
 */
async function hitungOCI(filter) {
  const ociAkun = await Akun.findOne({
    kodeAkun: '5-1008',
    aktif: true
  });

  let total = 0;
  const detail = [];

  if (ociAkun) {
    const jurnal = await JurnalEntry.find({
      status: filter.status,
      tanggal: filter.tanggal,
      'items.akun': ociAkun._id
    });

    jurnal.forEach(j => {
      j.items.forEach(item => {
        if (item.akun.toString() === ociAkun._id.toString()) {
          // OCI bisa positif atau negatif
          total += (item.kredit || 0) - (item.debit || 0);
        }
      });
    });

    if (total !== 0) {
      detail.push({
        kodeAkun: ociAkun.kodeAkun,
        namaAkun: ociAkun.namaAkun,
        jumlah: total
      });
    }
  }

  return { total, detail };
}

export { labaRugiMultipleStepController };