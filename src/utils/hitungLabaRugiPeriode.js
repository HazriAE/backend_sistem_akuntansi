import { Akun } from "../models/akunSchema.js";
import { JurnalEntry } from "../models/jurnalEntrySchema.js";

export async function hitungLabaRugiPeriode(startDate, endDate) {
  const filter = {
    status: 'posted',
    tanggal: {
      $gte: startDate,
      $lte: endDate
    }
  };

  // Get akun pendapatan dan beban
  const pendapatanAkun = await Akun.find({ tipeAkun: 'pendapatan', aktif: true });
  const bebanAkun = await Akun.find({ tipeAkun: 'beban', aktif: true });

  let totalPendapatan = 0;
  let totalBeban = 0;

  // Hitung pendapatan
  for (let akun of pendapatanAkun) {
    const jurnal = await JurnalEntry.find({
      ...filter,
      'items.akun': akun._id
    });

    jurnal.forEach(j => {
      j.items.forEach(item => {
        if (item.akun.toString() === akun._id.toString()) {
          totalPendapatan += (item.kredit || 0) - (item.debit || 0);
        }
      });
    });
  }

  // Hitung beban
  for (let akun of bebanAkun) {
    const jurnal = await JurnalEntry.find({
      ...filter,
      'items.akun': akun._id
    });

    jurnal.forEach(j => {
      j.items.forEach(item => {
        if (item.akun.toString() === akun._id.toString()) {
          totalBeban += (item.debit || 0) - (item.kredit || 0);
        }
      });
    });
  }

  return totalPendapatan - totalBeban;
}