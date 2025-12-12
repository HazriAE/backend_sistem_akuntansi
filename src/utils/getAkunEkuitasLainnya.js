import { Akun } from "../models/akunSchema.js";
import { JurnalEntry } from "../models/jurnalEntrySchema.js";

/**
 * Get akun ekuitas lainnya (selain modal, tambahan modal, saldo laba)
 */
async function getAkunEkuitasLainnya(startDate, endDate) {
  const excludePatterns = ['Modal Saham', 'Tambahan Modal', 'Saldo Laba'];
  
  const akuns = await Akun.find({
    tipeAkun: 'ekuitas',
    aktif: true,
    namaAkun: { 
      $not: { 
        $regex: excludePatterns.join('|'), 
        $options: 'i' 
      } 
    }
  });

  let totalSaldoAwal = 0;
  let totalKredit = 0;
  let totalDebit = 0;

  for (let akun of akuns) {
    totalSaldoAwal += akun.saldoAwal;

    const jurnal = await JurnalEntry.find({
      status: 'posted',
      'items.akun': akun._id,
      tanggal: { $gte: startDate, $lte: endDate }
    });

    jurnal.forEach(j => {
      j.items.forEach(item => {
        if (item.akun.toString() === akun._id.toString()) {
          totalKredit += item.kredit || 0;
          totalDebit += item.debit || 0;
        }
      });
    });
  }

  return {
    saldoAwal: totalSaldoAwal,
    mutasi: totalKredit - totalDebit,
    saldoAkhir: totalSaldoAwal + totalKredit - totalDebit
  };
}
