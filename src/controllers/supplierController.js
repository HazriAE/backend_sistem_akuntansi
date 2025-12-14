import { SupplierService } from "../service/supplierService.js";

export const SupplierController = {
  async create(req, res) {
    try {
      const supplier = await SupplierService.create(req.body);
      res.status(201).json(supplier);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  async getAll(req, res) {
    try {
      const { aktif } = req.query;

      const suppliers = await SupplierService.findAll({
        aktif: aktif !== undefined ? aktif === 'true' : undefined
      });

      res.json(suppliers);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getById(req, res) {
    try {
      const supplier = await SupplierService.findById(req.params.id);

      if (!supplier) {
        return res.status(404).json({ message: 'Supplier tidak ditemukan' });
      }

      res.json(supplier);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async update(req, res) {
    try {
      const supplier = await SupplierService.update(
        req.params.id,
        req.body
      );

      if (!supplier) {
        return res.status(404).json({ message: 'Supplier tidak ditemukan' });
      }

      res.json(supplier);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  async remove(req, res) {
    try {
      const supplier = await SupplierService.remove(req.params.id);

      if (!supplier) {
        return res.status(404).json({ message: 'Supplier tidak ditemukan' });
      }

      res.json({ message: 'Supplier berhasil dihapus' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};
