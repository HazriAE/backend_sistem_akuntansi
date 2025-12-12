

export function tentukanKategoriArusKas(akunPasangan) {
  if (!akunPasangan || akunPasangan.length === 0) return 'OPERASI';

  for (let item of akunPasangan) {
    if (!item.akun) continue;

    const kodeAkun = item.akun.kodeAkun;
    const tipeAkun = item.akun.tipeAkun;

    // 1. ARUS KAS OPERASI (Kegiatan Rutin)
    // Kode 4-xxxx (Pendapatan) → Kas bertambah = Penerimaan dari Pelanggan
    if (kodeAkun.startsWith('4-')) {
      return 'OPERASI';
    }

    // Kode 5-xxxx (Beban) → Pembayaran operasional
    if (kodeAkun.startsWith('5-1001')) return 'OPERASI'; // Beban Pokok Penjualan
    if (kodeAkun.startsWith('5-1002')) return 'OPERASI'; // Beban Usaha
    if (kodeAkun.startsWith('5-1004')) return 'OPERASI'; // Beban Pajak

    // Kode 2-1xxx (Utang Lancar) → Pelunasan Utang Supplier
    if (kodeAkun.startsWith('2-1') && kodeAkun.match(/2-11\d{2}/)) {
      return 'OPERASI';
    }

    // Kode 1-1xxx (Aset Lancar selain Kas) → Penerimaan Pelunasan dari Customer
    if (kodeAkun.startsWith('1-1') && kodeAkun.match(/1-11\d{2}/)) {
      return 'OPERASI';
    }

    // 2. ARUS KAS INVESTASI (Jangka Panjang)
    // Kode 1-2xxx (Aset Tidak Lancar) → Pembelian/Penjualan Aset
    if (kodeAkun.startsWith('1-2')) {
      return 'INVESTASI';
    }

    // 3. ARUS KAS PENDANAAN (Modal & Utang Bank)
    // Kode 3-xxxx (Ekuitas) → Setoran Modal / Pembayaran Dividen
    if (kodeAkun.startsWith('3-1101')) return 'PENDANAAN'; // Modal Saham
    if (kodeAkun.startsWith('3-1104')) return 'PENDANAAN'; // Saldo Laba (Dividen)

    // Kode 2-2xxx (Utang Jangka Panjang) → Pembayaran Cicilan / Utang Bank
    if (kodeAkun.startsWith('2-2')) {
      return 'PENDANAAN';
    }
  }

  // Default: OPERASI
  return 'OPERASI';
}
