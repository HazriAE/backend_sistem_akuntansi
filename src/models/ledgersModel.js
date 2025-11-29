import mongoose from "mongoose";

const ledgerSchema = new mongoose.Schema({
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  date: { type: Date, required: true },
  debit: { type: Number, default: 0 },
  kredit: { type: Number, default: 0 },
  saldo: { type: Number, default: 0 }
});

export const Ledger = mongoose.model('Ledger', ledgerSchema);
