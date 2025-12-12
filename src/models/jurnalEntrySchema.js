import mongoose from "mongoose";

const jurnalEntrySchema = new mongoose.Schema({
  nomorJurnal: {
    type: String,
    required: true,
    unique: true
  },
  tanggal: {
    type: Date,
    required: true,
    default: Date.now
  },
  deskripsi: {
    type: String,
    required: true,
    trim: true
  },
  jenisTransaksi: {
    type: String,
    enum: ['penjualan', 'pembelian', 'kas_masuk', 'kas_keluar', 'penyesuaian', 'umum'],
    default: 'umum'
  },
  referensi: {
    tipe: {
      type: String,
      enum: ['kontak', 'umum']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kontak'
    }
  },
  items: [{
    akun: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Akun',
      required: true
    },
    kodeAkun: String,
    namaAkun: String,
    debit: {
      type: Number,
      default: 0,
      min: 0
    },
    kredit: {
      type: Number,
      default: 0,
      min: 0
    },
    keterangan: String
  }],
  totalDebit: {
    type: Number,
    required: true,
    default: 0
  },
  totalKredit: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'posted', 'void'],
    default: 'draft'
  },
  dibuatOleh: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true
});


// Validasi untuk memastikan debit = kredit
// jurnalEntrySchema.pre('save', function(next) {
//   let totalDebit = 0;
//   let totalKredit = 0;
  
//   this.items.forEach(item => {
//     totalDebit += item.debit || 0;
//     totalKredit += item.kredit || 0;
//   });
  
//   this.totalDebit = totalDebit;
//   this.totalKredit = totalKredit;
  
//   if (Math.abs(totalDebit - totalKredit) > 0.01) {
//     next(new Error('Total debit dan kredit harus sama'));
//   }
  
//   next();
// });

// Index untuk performa query laporan
jurnalEntrySchema.index({ tanggal: 1, status: 1 });
jurnalEntrySchema.index({ 'items.akun': 1, tanggal: 1 });

export const JurnalEntry = mongoose.model('JurnalEntry', jurnalEntrySchema);
