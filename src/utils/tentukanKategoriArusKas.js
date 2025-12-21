export function tentukanKategoriArusKas(akunPasangan) {
  if (!akunPasangan || akunPasangan.length === 0) return 'OPERASI';

  for (let item of akunPasangan) {
    if (!item.akun) continue;

    const kodeAkun = item.akun.kodeAkun;
    const tipeAkun = item.akun.tipeAkun;

    // ============================================
    // 1. ARUS KAS OPERASI (Kegiatan Rutin)
    // ============================================
    
    // Pendapatan (4-xxxx) → Penerimaan dari pelanggan
    if (kodeAkun.startsWith('4-')) {
      return 'OPERASI';
    }

    // Beban Operasional (5-xxxx)
    if (kodeAkun.startsWith('5-1001')) return 'OPERASI'; // HPP
    if (kodeAkun.startsWith('5-1002')) return 'OPERASI'; // Beban Usaha
    if (kodeAkun.startsWith('5-1003')) return 'OPERASI'; // Beban Lain-lain
    if (kodeAkun.startsWith('5-1004')) return 'OPERASI'; // Beban Pajak Final
    if (kodeAkun.startsWith('5-1006')) return 'OPERASI'; // Beban Keuangan
    if (kodeAkun.startsWith('5-1007')) return 'OPERASI'; // Beban Pajak Penghasilan

    // Aset Lancar (1-11xx) - kecuali Kas
    if (kodeAkun.startsWith('1-11') && kodeAkun !== '1-1101') {
      return 'OPERASI'; // Piutang, Persediaan, Pajak/Biaya Dibayar Dimuka, dll
    }

    // Liabilitas Lancar (2-11xx)
    if (kodeAkun.startsWith('2-11')) {
      return 'OPERASI'; // Utang Usaha, Beban Akrual, Utang Pajak, dll
    }

    // Liabilitas Imbalan Kerja Jangka Pendek
    if (kodeAkun === '2-1106') return 'OPERASI';

    // ============================================
    // 2. ARUS KAS INVESTASI (Aset Jangka Panjang)
    // ============================================
    
    // Aset Tidak Lancar (1-2xxx) - Properti, Aset Tetap, dll
    if (kodeAkun.startsWith('1-2')) {
      return 'INVESTASI';
    }

    // Bagian atas Laba/Rugi Entitas Asosiasi
    if (kodeAkun === '5-1005') return 'INVESTASI';

    // ============================================
    // 3. ARUS KAS PENDANAAN (Modal & Pinjaman)
    // ============================================
    
    // Ekuitas (3-xxxx) - Modal, Dividen, dll
    if (kodeAkun.startsWith('3-')) {
      return 'PENDANAAN';
    }

    // Liabilitas Jangka Panjang (2-2xxx)
    if (kodeAkun.startsWith('2-2')) {
      return 'PENDANAAN'; // Utang Bank, Liabilitas Sewa JP, dll
    }
  }

  // Default: OPERASI
  return 'OPERASI';
}