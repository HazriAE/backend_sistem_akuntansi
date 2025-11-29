import mongoose from "mongoose"

const akunSchema = new mongoose.Schema({
  kodeAkun: {
    type: String,
    required: true,
    unique: true
  },
  namaAkun: {
    type: String,
    required: true,
    trim: true
  },
  tipeAkun: {
    type: String,
    required: true,
    enum: ['aset', 'liabilitas', 'ekuitas', 'pendapatan', 'beban'],
    lowercase: true
  },
  kategori: {
    type: String,
    enum: ['kas', 'bank', 'piutang', 'persediaan', 'aset_tetap', 'hutang', 'modal', 'penjualan', 'pembelian', 'biaya_operasional', 'lainnya'],
    lowercase: true
  },
  saldoNormal: {
    type: String,
    enum: ['debit', 'kredit'],
    required: true
  },
  saldoAwal: {
    type: Number,
    default: 0
  },
  aktif: {
    type: Boolean,
    default: true
  },
  deskripsi: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});


export const Akun = mongoose.model("Akun", akunSchema);