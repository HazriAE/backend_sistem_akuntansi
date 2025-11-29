import { Akun } from "../models/akunSchema.js";
// import { Kontak } from "../models/kontakSchema";
import { JurnalEntry } from "../models/jurnalEntrySchema.js";

export const laporanController = {
  // Jurnal Umum (semua transaksi)
  jurnalUmum: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const filter = { status: 'posted' };

      if (startDate || endDate) {
        filter.tanggal = {};
        if (startDate) filter.tanggal.$gte = new Date(startDate);
        if (endDate) filter.tanggal.$lte = new Date(endDate);
      }

      const jurnal = await JurnalEntry.find(filter)
        .populate('items.akun', 'kodeAkun namaAkun')
        .sort({ tanggal: 1, nomorJurnal: 1 });

      res.json({
        success: true,
        data: jurnal
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Buku Besar per Akun
  bukuBesar: async (req, res) => {
    try {
      const { akunId, startDate, endDate } = req.query;

      if (!akunId) {
        return res.status(400).json({
          success: false,
          message: 'Parameter akunId diperlukan'
        });
      }

      const akun = await Akun.findById(akunId);
      if (!akun) {
        return res.status(404).json({
          success: false,
          message: 'Akun tidak ditemukan'
        });
      }

      const filter = {
        status: 'posted',
        'items.akun': akunId
      };

      if (startDate || endDate) {
        filter.tanggal = {};
        if (startDate) filter.tanggal.$gte = new Date(startDate);
        if (endDate) filter.tanggal.$lte = new Date(endDate);
      }

      const jurnal = await JurnalEntry.find(filter).sort({ tanggal: 1 });

      // Format data untuk buku besar
      let saldo = akun.saldoAwal;
      const transaksi = [];

      jurnal.forEach(j => {
        j.items.forEach(item => {
          if (item.akun.toString() === akunId) {
            const debit = item.debit || 0;
            const kredit = item.kredit || 0;
            
            // Hitung saldo berdasarkan saldo normal
            if (akun.saldoNormal === 'debit') {
              saldo = saldo + debit - kredit;
            } else {
              saldo = saldo + kredit - debit;
            }

            transaksi.push({
              tanggal: j.tanggal,
              nomorJurnal: j.nomorJurnal,
              deskripsi: j.deskripsi,
              keterangan: item.keterangan,
              debit,
              kredit,
              saldo
            });
          }
        });
      });

      res.json({
        success: true,
        data: {
          akun: {
            kodeAkun: akun.kodeAkun,
            namaAkun: akun.namaAkun,
            saldoAwal: akun.saldoAwal
          },
          transaksi,
          saldoAkhir: saldo
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Neraca Saldo
  neracaSaldo: async (req, res) => {
    try {
      const { endDate } = req.query;
      const tanggalAkhir = endDate ? new Date(endDate) : new Date();

      const akuns = await Akun.find({ aktif: true }).sort({ kodeAkun: 1 });
      const neracaData = [];

      for (let akun of akuns) {
        const filter = {
          status: 'posted',
          'items.akun': akun._id,
          tanggal: { $lte: tanggalAkhir }
        };

        const jurnal = await JurnalEntry.find(filter);

        let totalDebit = akun.saldoAwal > 0 && akun.saldoNormal === 'debit' ? akun.saldoAwal : 0;
        let totalKredit = akun.saldoAwal > 0 && akun.saldoNormal === 'kredit' ? akun.saldoAwal : 0;

        jurnal.forEach(j => {
          j.items.forEach(item => {
            if (item.akun.toString() === akun._id.toString()) {
              totalDebit += item.debit || 0;
              totalKredit += item.kredit || 0;
            }
          });
        });

        const saldo = totalDebit - totalKredit;

        neracaData.push({
          kodeAkun: akun.kodeAkun,
          namaAkun: akun.namaAkun,
          tipeAkun: akun.tipeAkun,
          debit: saldo > 0 ? saldo : 0,
          kredit: saldo < 0 ? Math.abs(saldo) : 0
        });
      }

      const totalDebit = neracaData.reduce((sum, item) => sum + item.debit, 0);
      const totalKredit = neracaData.reduce((sum, item) => sum + item.kredit, 0);

      res.json({
        success: true,
        data: {
          tanggal: tanggalAkhir,
          akun: neracaData,
          total: {
            debit: totalDebit,
            kredit: totalKredit
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Laporan Laba Rugi
  labaRugi: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const filter = { status: 'posted' };

      if (startDate || endDate) {
        filter.tanggal = {};
        if (startDate) filter.tanggal.$gte = new Date(startDate);
        if (endDate) filter.tanggal.$lte = new Date(endDate);
      }

      const pendapatanAkun = await Akun.find({ tipeAkun: 'pendapatan', aktif: true });
      const bebanAkun = await Akun.find({ tipeAkun: 'beban', aktif: true });

      const pendapatan = [];
      const beban = [];

      // Hitung pendapatan
      for (let akun of pendapatanAkun) {
        const jurnal = await JurnalEntry.find({
          ...filter,
          'items.akun': akun._id
        });

        let total = 0;
        jurnal.forEach(j => {
          j.items.forEach(item => {
            if (item.akun.toString() === akun._id.toString()) {
              total += (item.kredit || 0) - (item.debit || 0);
            }
          });
        });

        if (total !== 0) {
          pendapatan.push({
            kodeAkun: akun.kodeAkun,
            namaAkun: akun.namaAkun,
            jumlah: total
          });
        }
      }

      // Hitung beban
      for (let akun of bebanAkun) {
        const jurnal = await JurnalEntry.find({
          ...filter,
          'items.akun': akun._id
        });

        let total = 0;
        jurnal.forEach(j => {
          j.items.forEach(item => {
            if (item.akun.toString() === akun._id.toString()) {
              total += (item.debit || 0) - (item.kredit || 0);
            }
          });
        });

        if (total !== 0) {
          beban.push({
            kodeAkun: akun.kodeAkun,
            namaAkun: akun.namaAkun,
            jumlah: total
          });
        }
      }

      const totalPendapatan = pendapatan.reduce((sum, item) => sum + item.jumlah, 0);
      const totalBeban = beban.reduce((sum, item) => sum + item.jumlah, 0);
      const labaRugi = totalPendapatan - totalBeban;

      res.json({
        success: true,
        data: {
          periode: {
            dari: startDate || 'Awal',
            sampai: endDate || 'Sekarang'
          },
          pendapatan,
          totalPendapatan,
          beban,
          totalBeban,
          labaRugi,
          status: labaRugi >= 0 ? 'Laba' : 'Rugi'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Neraca (Balance Sheet)
  neraca: async (req, res) => {
    try {
      const { endDate } = req.query;
      const tanggalAkhir = endDate ? new Date(endDate) : new Date();

      const asetAkun = await Akun.find({ tipeAkun: 'aset', aktif: true }).sort({ kodeAkun: 1 });
      const liabilitasAkun = await Akun.find({ tipeAkun: 'liabilitas', aktif: true }).sort({ kodeAkun: 1 });
      const ekuitasAkun = await Akun.find({ tipeAkun: 'ekuitas', aktif: true }).sort({ kodeAkun: 1 });

      const aset = [];
      const liabilitas = [];
      const ekuitas = [];

      // Hitung Aset
      for (let akun of asetAkun) {
        const jurnal = await JurnalEntry.find({
          status: 'posted',
          'items.akun': akun._id,
          tanggal: { $lte: tanggalAkhir }
        });

        let total = akun.saldoAwal;
        jurnal.forEach(j => {
          j.items.forEach(item => {
            if (item.akun.toString() === akun._id.toString()) {
              total += (item.debit || 0) - (item.kredit || 0);
            }
          });
        });

        if (total !== 0) {
          aset.push({
            kodeAkun: akun.kodeAkun,
            namaAkun: akun.namaAkun,
            jumlah: total
          });
        }
      }

      // Hitung Liabilitas
      for (let akun of liabilitasAkun) {
        const jurnal = await JurnalEntry.find({
          status: 'posted',
          'items.akun': akun._id,
          tanggal: { $lte: tanggalAkhir }
        });

        let total = akun.saldoAwal;
        jurnal.forEach(j => {
          j.items.forEach(item => {
            if (item.akun.toString() === akun._id.toString()) {
              total += (item.kredit || 0) - (item.debit || 0);
            }
          });
        });

        if (total !== 0) {
          liabilitas.push({
            kodeAkun: akun.kodeAkun,
            namaAkun: akun.namaAkun,
            jumlah: total
          });
        }
      }

      // Hitung Ekuitas
      for (let akun of ekuitasAkun) {
        const jurnal = await JurnalEntry.find({
          status: 'posted',
          'items.akun': akun._id,
          tanggal: { $lte: tanggalAkhir }
        });

        let total = akun.saldoAwal;
        jurnal.forEach(j => {
          j.items.forEach(item => {
            if (item.akun.toString() === akun._id.toString()) {
              total += (item.kredit || 0) - (item.debit || 0);
            }
          });
        });

        if (total !== 0) {
          ekuitas.push({
            kodeAkun: akun.kodeAkun,
            namaAkun: akun.namaAkun,
            jumlah: total
          });
        }
      }

      const totalAset = aset.reduce((sum, item) => sum + item.jumlah, 0);
      const totalLiabilitas = liabilitas.reduce((sum, item) => sum + item.jumlah, 0);
      const totalEkuitas = ekuitas.reduce((sum, item) => sum + item.jumlah, 0);

      res.json({
        success: true,
        data: {
          tanggal: tanggalAkhir,
          aset,
          totalAset,
          liabilitas,
          totalLiabilitas,
          ekuitas,
          totalEkuitas,
          totalLiabilitasDanEkuitas: totalLiabilitas + totalEkuitas,
          balance: Math.abs(totalAset - (totalLiabilitas + totalEkuitas)) < 0.01
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};