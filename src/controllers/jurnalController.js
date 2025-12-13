import { JurnalEntry } from "../models/jurnalEntrySchema.js";
import { Akun } from "../models/akunSchema.js";

export const jurnalController = {
  // Get all jurnal
  getAll: async (req, res) => {
    try {
      const { status, jenisTransaksi, startDate, endDate } = req.query;
      const filter = {};

      if (status) filter.status = status;
      if (jenisTransaksi) filter.jenisTransaksi = jenisTransaksi;
      if (startDate || endDate) {
        filter.tanggal = {};
        if (startDate) filter.tanggal.$gte = new Date(startDate);
        if (endDate) filter.tanggal.$lte = new Date(endDate);
      }

      const jurnal = await JurnalEntry.find(filter)
        .populate('items.akun', 'kodeAkun namaAkun')
        .populate('referensi.id', 'kode nama')
        .sort({ tanggal: -1, nomorJurnal: -1 });

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

  // Get by ID
  getById: async (req, res) => {
    try {
      const jurnal = await JurnalEntry.findById(req.params.id)
        .populate('items.akun', 'kodeAkun namaAkun')
        .populate('referensi.id', 'kode nama');

      if (!jurnal) {
        return res.status(404).json({
          success: false,
          message: 'Jurnal tidak ditemukan'
        });
      }
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

  create: async (req, res) => {
    try {
      const { nomorJurnal, tanggal, deskripsi, jenisTransaksi, items, status } = req.body;

      // Validasi items
      if (!items || items.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Minimal 2 baris transaksi diperlukan'
        });
      }

      // Populate kode dan nama akun dari referensi & hitung total
      let totalDebit = 0;
      let totalKredit = 0;
      
      for (let item of items) {
        const akun = await Akun.findById(item.akun);
        if (!akun) {
          return res.status(400).json({
            success: false,
            message: `Akun dengan ID ${item.akun} tidak ditemukan`
          });
        }
        
        item.kodeAkun = akun.kodeAkun;
        item.namaAkun = akun.namaAkun;
        
        // Akumulasi total
        totalDebit += parseFloat(item.debit) || 0;
        totalKredit += parseFloat(item.kredit) || 0;
      }

      // Validasi balance
      if (totalDebit !== totalKredit) {
        return res.status(400).json({
          success: false,
          message: `Jurnal tidak seimbang. Debit: ${totalDebit}, Kredit: ${totalKredit}`
        });
      }

      if (totalDebit === 0) {
        return res.status(400).json({
          success: false,
          message: 'Total debit dan kredit tidak boleh 0'
        });
      }

      // Create jurnal dengan data yang sudah divalidasi
      const jurnal = await JurnalEntry.create({
        nomorJurnal,
        tanggal,
        deskripsi,
        jenisTransaksi: jenisTransaksi || 'umum',
        items,
        totalDebit,
        totalKredit,
        status: status || 'draft',
        dibuatOleh: req.user?.name || 'system' // Jika ada auth
      });

      res.status(201).json({
        success: true,
        message: 'Jurnal berhasil dibuat',
        data: jurnal
      });
    } catch (error) {
      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Nomor jurnal sudah digunakan'
        });
      }

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Update
  update: async (req, res) => {
    try {
      const jurnal = await JurnalEntry.findById(req.params.id);
      
      if (!jurnal) {
        return res.status(404).json({
          success: false,
          message: 'Jurnal tidak ditemukan'
        });
      }

      // Cek status, hanya draft yang bisa diupdate
      if (jurnal.status === 'posted') {
        return res.status(400).json({
          success: false,
          message: 'Jurnal yang sudah di-post tidak bisa diupdate'
        });
      }

      // Populate kode dan nama akun
      if (req.body.items && req.body.items.length > 0) {
        for (let item of req.body.items) {
          const akun = await Akun.findById(item.akun);
          if (akun) {
            item.kodeAkun = akun.kodeAkun;
            item.namaAkun = akun.namaAkun;
          }
        }
      }

      const updatedJurnal = await JurnalEntry.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: 'Jurnal berhasil diupdate',
        data: updatedJurnal
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Post jurnal (ubah status dari draft ke posted)
  post: async (req, res) => {
    try {
      const jurnal = await JurnalEntry.findById(req.params.id);
      
      if (!jurnal) {
        return res.status(404).json({
          success: false,
          message: 'Jurnal tidak ditemukan'
        });
      }

      if (jurnal.status === 'posted') {
        return res.status(400).json({
          success: false,
          message: 'Jurnal sudah di-post sebelumnya'
        });
      }

      jurnal.status = 'posted';
      await jurnal.save();

      res.json({
        success: true,
        message: 'Jurnal berhasil di-post',
        data: jurnal
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Void jurnal
  void: async (req, res) => {
    try {
      const jurnal = await JurnalEntry.findById(req.params.id);
      
      if (!jurnal) {
        return res.status(404).json({
          success: false,
          message: 'Jurnal tidak ditemukan'
        });
      }

      jurnal.status = 'void';
      await jurnal.save();

      res.json({
        success: true,
        message: 'Jurnal berhasil di-void',
        data: jurnal
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Delete
  delete: async (req, res) => {
    try {
      const jurnal = await JurnalEntry.findById(req.params.id);
      
      if (!jurnal) {
        return res.status(404).json({
          success: false,
          message: 'Jurnal tidak ditemukan'
        });
      }

      // Hanya draft yang bisa dihapus
      if (jurnal.status === 'posted') {
        return res.status(400).json({
          success: false,
          message: 'Jurnal yang sudah di-post tidak bisa dihapus. Gunakan void.'
        });
      }

      await JurnalEntry.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: 'Jurnal berhasil dihapus'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },
  // Generate nomor jurnal otomatis
  generateNumber: async (req, res) => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      
      // Format: JU-YYYYMM-XXXX
      const prefix = `JU-${year}${month}`;
      
      // Cari jurnal terakhir dengan prefix yang sama
      const lastJurnal = await JurnalEntry.findOne({
        nomorJurnal: new RegExp(`^${prefix}`)
      })
      .sort({ nomorJurnal: -1 })
      .limit(1);

      let nextNumber = 1;
      if (lastJurnal) {
        const lastNumber = parseInt(lastJurnal.nomorJurnal.split('-')[2]);
        nextNumber = lastNumber + 1;
      }

      const nomorJurnal = `${prefix}-${String(nextNumber).padStart(4, '0')}`;

      res.json({
        success: true,
        nomorJurnal
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },
};