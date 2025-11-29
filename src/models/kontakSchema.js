import mongoose from "mongoose";

const kontakSchema = new mongoose.Schema({
  kode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  nama: {
    type: String,
    required: true,
    trim: true
  },
  tipe: {
    type: String,
    required: true,
    enum: ['customer', 'supplier', 'both'],
    lowercase: true
  },
  noHp: {
    type: String,
    trim: true
  },
  alamat: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  aktif: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index untuk filter berdasarkan tipe
kontakSchema.index({ tipe: 1, aktif: 1 });

export const Kontak = mongoose.model('Kontak', kontakSchema);

