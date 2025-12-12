import { Akun } from "../models/akunSchema.js";
// import { Kontak } from "../models/kontakSchema";
import { JurnalEntry } from "../models/jurnalEntrySchema.js";
import { hitungLabaRugiPeriode } from "../utils/hitungLabaRugiPeriode.js";
import { tentukanKategoriArusKas } from "../utils/tentukanKategoriArusKas.js";

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
  },
  
  bukuBesarAll: async (req, res) => {
    try {
      const { startDate, endDate, tipeAkun, kategori } = req.query;
      
      // Build filter untuk akun
      const akunFilter = { aktif: true };
      if (tipeAkun) akunFilter.tipeAkun = tipeAkun;
      if (kategori) akunFilter.kategori = kategori;

      // Get semua akun yang sesuai filter
      const akuns = await Akun.find(akunFilter).sort({ kodeAkun: 1 });

      // Build filter untuk jurnal
      const jurnalFilter = { status: 'posted' };
      if (startDate || endDate) {
        jurnalFilter.tanggal = {};
        if (startDate) jurnalFilter.tanggal.$gte = new Date(startDate);
        if (endDate) jurnalFilter.tanggal.$lte = new Date(endDate);
      }

      // Array untuk menyimpan hasil
      const bukuBesarData = [];

      // Loop setiap akun
      for (let akun of akuns) {
        // Filter jurnal yang mengandung akun ini
        const filter = {
          ...jurnalFilter,
          'items.akun': akun._id
        };

        const jurnal = await JurnalEntry.find(filter).sort({ tanggal: 1 });

        // Format data untuk buku besar
        let saldo = akun.saldoAwal;
        const transaksi = [];
        let totalDebit = 0;
        let totalKredit = 0;

        jurnal.forEach(j => {
          j.items.forEach(item => {
            if (item.akun.toString() === akun._id.toString()) {
              const debit = item.debit || 0;
              const kredit = item.kredit || 0;
              
              totalDebit += debit;
              totalKredit += kredit;
              
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

        // Hanya masukkan akun yang ada transaksi atau saldo awal tidak 0
        if (transaksi.length > 0 || akun.saldoAwal !== 0) {
          bukuBesarData.push({
            akun: {
              id: akun._id,
              kodeAkun: akun.kodeAkun,
              namaAkun: akun.namaAkun,
              tipeAkun: akun.tipeAkun,
              kategori: akun.kategori,
              saldoAwal: akun.saldoAwal
            },
            transaksi,
            totalDebit,
            totalKredit,
            mutasi: totalDebit - totalKredit,
            saldoAkhir: saldo,
            jumlahTransaksi: transaksi.length
          });
        }
      }

      res.json({
        success: true,
        data: {
          periode: {
            dari: startDate || 'Awal',
            sampai: endDate || 'Sekarang'
          },
          filter: {
            tipeAkun: tipeAkun || 'Semua',
            kategori: kategori || 'Semua'
          },
          jumlahAkun: bukuBesarData.length,
          akun: bukuBesarData
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },
  
  perubahanEkuitas: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      // Set default periode (awal tahun sampai sekarang jika tidak ada)
      const periodeAwal = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
      const periodeAkhir = endDate ? new Date(endDate) : new Date();

      // Get semua akun ekuitas
      const akunEkuitas = await Akun.find({ 
        tipeAkun: 'ekuitas', 
        aktif: true 
      }).sort({ kodeAkun: 1 });

      // Build data untuk setiap akun ekuitas
      const ekuitasData = [];

      for (let akun of akunEkuitas) {
        // Saldo awal periode (saldo awal akun)
        const saldoAwalPeriode = akun.saldoAwal;

        // Get transaksi dalam periode
        const jurnalFilter = {
          status: 'posted',
          'items.akun': akun._id,
          tanggal: {
            $gte: periodeAwal,
            $lte: periodeAkhir
          }
        };

        const jurnal = await JurnalEntry.find(jurnalFilter).sort({ tanggal: 1 });

        // Hitung mutasi
        let totalKredit = 0;
        let totalDebit = 0;
        const mutasi = [];

        jurnal.forEach(j => {
          j.items.forEach(item => {
            if (item.akun.toString() === akun._id.toString()) {
              const kredit = item.kredit || 0;
              const debit = item.debit || 0;
              
              totalKredit += kredit;
              totalDebit += debit;

              // Track mutasi detail
              if (kredit > 0 || debit > 0) {
                mutasi.push({
                  tanggal: j.tanggal,
                  nomorJurnal: j.nomorJurnal,
                  deskripsi: j.deskripsi,
                  jenisTransaksi: j.jenisTransaksi,
                  penambahan: kredit,
                  pengurangan: debit
                });
              }
            }
          });
        });

        // Hitung saldo akhir
        const mutasiNet = totalKredit - totalDebit;
        const saldoAkhirPeriode = saldoAwalPeriode + mutasiNet;

        ekuitasData.push({
          akun: {
            kodeAkun: akun.kodeAkun,
            namaAkun: akun.namaAkun,
            kategori: akun.kategori
          },
          saldoAwal: saldoAwalPeriode,
          penambahan: totalKredit,
          pengurangan: totalDebit,
          mutasiNet,
          saldoAkhir: saldoAkhirPeriode,
          mutasiDetail: mutasi
        });
      }

      // Hitung laba/rugi periode berjalan
      const labaRugiPeriode = await hitungLabaRugiPeriode(periodeAwal, periodeAkhir);

      // Total ekuitas
      const totalEkuitasAwal = ekuitasData.reduce((sum, item) => sum + item.saldoAwal, 0);
      const totalPenambahan = ekuitasData.reduce((sum, item) => sum + item.penambahan, 0);
      const totalPengurangan = ekuitasData.reduce((sum, item) => sum + item.pengurangan, 0);
      const totalEkuitasAkhir = ekuitasData.reduce((sum, item) => sum + item.saldoAkhir, 0) + labaRugiPeriode;

      res.json({
        success: true,
        data: {
          periode: {
            dari: periodeAwal,
            sampai: periodeAkhir
          },
          komponenEkuitas: ekuitasData,
          labaRugiPeriode,
          summary: {
            totalEkuitasAwal,
            totalPenambahan,
            totalPengurangan,
            labaRugiBerjalan: labaRugiPeriode,
            totalEkuitasAkhir
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
  arusKas: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const periodeAwal = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
      const periodeAkhir = endDate ? new Date(endDate) : new Date();

      // Get akun kas (1-1101 atau kategori kas)
      const akunKas = await Akun.findOne({
        kodeAkun: { $regex: '^1-11' },
        kategori: 'kas',
        aktif: true
      });

      if (!akunKas) {
        return res.status(404).json({
          success: false,
          message: 'Akun kas tidak ditemukan'
        });
      }

      // Filter jurnal dalam periode
      const jurnalFilter = {
        status: 'posted',
        tanggal: {
          $gte: periodeAwal,
          $lte: periodeAkhir
        }
      };

      const semuaJurnal = await JurnalEntry.find(jurnalFilter)
        .populate('items.akun', 'kodeAkun namaAkun tipeAkun kategori')
        .sort({ tanggal: 1 });

      // Inisialisasi kategori arus kas
      const arusKasOperasi = [];
      const arusKasInvestasi = [];
      const arusKasPendanaan = [];

      // Process setiap jurnal
      for (let jurnal of semuaJurnal) {
        // Cek apakah jurnal melibatkan kas
        const itemKas = jurnal.items.find(item => 
          item.akun && item.akun._id.toString() === akunKas._id.toString()
        );

        if (!itemKas) continue;

        const kasDebit = itemKas.debit || 0;
        const kasKredit = itemKas.kredit || 0;
        const netKas = kasDebit - kasKredit; // positif = kas masuk, negatif = kas keluar

        // Analisis akun pasangan (akun selain kas)
        const akunPasangan = jurnal.items.filter(item => 
          item.akun && item.akun._id.toString() !== akunKas._id.toString()
        );

        // Tentukan kategori arus kas berdasarkan kode akun pasangan
        const kategori = tentukanKategoriArusKas(akunPasangan);

        const transaksiDetail = {
          tanggal: jurnal.tanggal,
          nomorJurnal: jurnal.nomorJurnal,
          deskripsi: jurnal.deskripsi,
          masuk: kasDebit,
          keluar: kasKredit,
          net: netKas,
          akunTerkait: akunPasangan.map(item => ({
            kodeAkun: item.akun.kodeAkun,
            namaAkun: item.akun.namaAkun
          }))
        };

        // Masukkan ke kategori yang sesuai
        if (kategori === 'OPERASI') {
          arusKasOperasi.push(transaksiDetail);
        } else if (kategori === 'INVESTASI') {
          arusKasInvestasi.push(transaksiDetail);
        } else if (kategori === 'PENDANAAN') {
          arusKasPendanaan.push(transaksiDetail);
        }
      }

      // Hitung total per kategori
      const totalOperasi = arusKasOperasi.reduce((sum, t) => sum + t.net, 0);
      const totalInvestasi = arusKasInvestasi.reduce((sum, t) => sum + t.net, 0);
      const totalPendanaan = arusKasPendanaan.reduce((sum, t) => sum + t.net, 0);

      // Hitung saldo kas
      const kasAwal = akunKas.saldoAwal;
      const perubahanKas = totalOperasi + totalInvestasi + totalPendanaan;
      const kasAkhir = kasAwal + perubahanKas;

      res.json({
        success: true,
        data: {
          periode: {
            dari: periodeAwal,
            sampai: periodeAkhir
          },
          kasAwal,
          arusKasOperasi: {
            transaksi: arusKasOperasi,
            totalMasuk: arusKasOperasi.reduce((sum, t) => sum + t.masuk, 0),
            totalKeluar: arusKasOperasi.reduce((sum, t) => sum + t.keluar, 0),
            net: totalOperasi
          },
          arusKasInvestasi: {
            transaksi: arusKasInvestasi,
            totalMasuk: arusKasInvestasi.reduce((sum, t) => sum + t.masuk, 0),
            totalKeluar: arusKasInvestasi.reduce((sum, t) => sum + t.keluar, 0),
            net: totalInvestasi
          },
          arusKasPendanaan: {
            transaksi: arusKasPendanaan,
            totalMasuk: arusKasPendanaan.reduce((sum, t) => sum + t.masuk, 0),
            totalKeluar: arusKasPendanaan.reduce((sum, t) => sum + t.keluar, 0),
            net: totalPendanaan
          },
          kenaikanPenurunanKas: perubahanKas,
          kasAkhir,
          summary: {
            totalKasMasuk: arusKasOperasi.reduce((sum, t) => sum + t.masuk, 0) +
                          arusKasInvestasi.reduce((sum, t) => sum + t.masuk, 0) +
                          arusKasPendanaan.reduce((sum, t) => sum + t.masuk, 0),
            totalKasKeluar: arusKasOperasi.reduce((sum, t) => sum + t.keluar, 0) +
                          arusKasInvestasi.reduce((sum, t) => sum + t.keluar, 0) +
                          arusKasPendanaan.reduce((sum, t) => sum + t.keluar, 0)
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

};