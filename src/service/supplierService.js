import { Kontak } from "../models/kontakSchema.js";

const SUPPLIER_TYPE = 'supplier';

export const SupplierService = {
  async create(data) {
    return await Kontak.create({
      ...data,
      tipe: SUPPLIER_TYPE
    });
  },

  async findAll({ aktif }) {
    const filter = {
      tipe: SUPPLIER_TYPE
    };

    if (aktif !== undefined) {
      filter.aktif = aktif;
    }

    return await Kontak.find(filter).sort({ nama: 1 });
  },

  async findById(id) {
    return await Kontak.findOne({
      _id: id,
      tipe: SUPPLIER_TYPE
    });
  },

  async update(id, data) {
    return await Kontak.findOneAndUpdate(
      { _id: id, tipe: SUPPLIER_TYPE },
      data,
      { new: true, runValidators: true }
    );
  },

  async remove(id) {
    return await Kontak.findOneAndDelete({
      _id: id,
      tipe: SUPPLIER_TYPE
    });
  }
};
