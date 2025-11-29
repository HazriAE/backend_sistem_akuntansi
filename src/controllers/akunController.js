import { Akun } from "../models/akunSchema.js";

export const akunController = {
  // Get all akun
  getAll: async (req, res) => {
    try {
      const { tipeAkun, kategori, aktif } = req.query;
      const filter = {};

      if (tipeAkun) filter.tipeAkun = tipeAkun;
      if (kategori) filter.kategori = kategori;
      if (aktif !== undefined) filter.aktif = aktif === 'true';

      const akun = await Akun.find(filter).sort({ kodeAkun: 1 });
      res.json({
        success: true,
        data: akun
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
      const akun = await Akun.findById(req.params.id);
      if (!akun) {
        return res.status(404).json({
          success: false,
          message: 'Akun tidak ditemukan'
        });
      }
      res.json({
        success: true,
        data: akun
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
      const akun = await Akun.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Akun berhasil dibuat',
        data: akun
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
      const akun = await Akun.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );
      if (!akun) {
        return res.status(404).json({
          success: false,
          message: 'Akun tidak ditemukan'
        });
      }
      res.json({
        success: true,
        message: 'Akun berhasil diupdate',
        data: akun
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
      const akun = await Akun.findByIdAndDelete(req.params.id);
      if (!akun) {
        return res.status(404).json({
          success: false,
          message: 'Akun tidak ditemukan'
        });
      }
      res.json({
        success: true,
        message: 'Akun berhasil dihapus'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};