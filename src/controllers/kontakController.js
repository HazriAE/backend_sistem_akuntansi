import { Kontak } from "../models/kontakSchema.js";

export const kontakController = {
  getAll: async (req, res) => {
    try {
      const { tipe, aktif, search } = req.query;
      const filter = {};

      if (tipe) {
        filter.tipe = { $in: [tipe, 'both'] };
      }
      if (aktif !== undefined) {
        filter.aktif = aktif === 'true';
      }
      if (search) {
        filter.$or = [
          { nama: { $regex: search, $options: 'i' } },
          { kode: { $regex: search, $options: 'i' } }
        ];
      }

      const kontak = await Kontak.find(filter).sort({ kode: 1 });
      res.json({
        success: true,
        data: kontak
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
      const kontak = await Kontak.findById(req.params.id);
      if (!kontak) {
        return res.status(404).json({
          success: false,
          message: 'Kontak tidak ditemukan'
        });
      }
      res.json({
        success: true,
        data: kontak
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  },

  // Create
  create: async (req, res) => {
    try {
      const kontak = await Kontak.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Kontak berhasil dibuat',
        data: kontak
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  },

  // Update
  update: async (req, res) => {
    try {
      const kontak = await Kontak.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!kontak) {
        return res.status(404).json({
          success: false,
          message: 'Kontak tidak ditemukan'
        });
      }
      res.json({
        success: true,
        message: 'Kontak berhasil diupdate',
        data: kontak
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
      const kontak = await Kontak.findByIdAndDelete(req.params.id);
      if (!kontak) {
        return res.status(404).json({
          success: false,
          message: 'Kontak tidak ditemukan'
        });
      }
      res.json({
        success: true,
        message: 'Kontak berhasil dihapus'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};
