import { Akun } from "../models/akunSchema.js";
import { JurnalEntry } from "../models/jurnalEntrySchema.js";

export async function getAkunEkuitas(kategori, namaPattern, startDate, endDate) {
  const akun = await Akun.findOne({
    tipeAkun: 'ekuitas',
    kategori: kategori,
    namaAkun: { $regex: namaPattern, $options: 'i' },
    aktif: true
  });

  if (!akun) {
    return { saldoAwal: 0, penambahan: 0, pengurangan: 0, saldoAkhir: 0 };
  }

  const jurnal = await JurnalEntry.find({
    status: 'posted',
    'items.akun': akun._id,
    tanggal: { $gte: startDate, $lte: endDate }
  });

  let totalKredit = 0;
  let totalDebit = 0;

  jurnal.forEach(j => {
    j.items.forEach(item => {
      if (item.akun.toString() === akun._id.toString()) {
        totalKredit += item.kredit || 0;
        totalDebit += item.debit || 0;
      }
    });
  });

  return {
    saldoAwal: akun.saldoAwal,
    penambahan: totalKredit,
    pengurangan: totalDebit,
    saldoAkhir: akun.saldoAwal + totalKredit - totalDebit
  };
}
