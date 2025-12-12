// ==================== FILE: src/utils/akunCodeGenerator.js ====================

import { Akun } from '../models/akunSchema.js';

/**
 * Mapping tipe akun ke prefix kode
 */
const TIPE_AKUN_PREFIX = {
  'aset': '1',
  'liabilitas': '2',
  'ekuitas': '3',
  'pendapatan': '4',
  'beban': '5'
};

/**
 * Mapping kategori ke sub-prefix (optional, bisa disesuaikan)
 */
const KATEGORI_SUBPREFIX = {
  // Aset (1-xxxx)
  'kas': '11',
  'bank': '12',
  'piutang': '13',
  'persediaan': '14',
  'aset_tetap': '15',
  
  // Liabilitas (2-xxxx)
  'hutang': '21',
  
  // Ekuitas (3-xxxx)
  'modal': '31',
  
  // Pendapatan (4-xxxx)
  'penjualan': '41',
  
  // Beban (5-xxxx)
  'pembelian': '51',
  'biaya_operasional': '52',
  
  // Lainnya
  'lainnya': '99'
};

/**
 * Generate kode akun otomatis berdasarkan tipe dan kategori
 * Format: TIPE-KATEGORIXX
 * Contoh: 1-1101, 2-2101, 3-3101
 * 
 * @param {string} tipeAkun - aset, liabilitas, ekuitas, pendapatan, beban
 * @param {string} kategori - kas, bank, piutang, hutang, modal, dll
 * @returns {Promise<string>} Kode akun yang ter-generate
 */
export const generateKodeAkun = async (tipeAkun, kategori = 'lainnya') => {
  try {
    // Validasi tipe akun
    if (!TIPE_AKUN_PREFIX[tipeAkun]) {
      throw new Error(`Tipe akun tidak valid: ${tipeAkun}`);
    }

    // Get prefix
    const prefix = TIPE_AKUN_PREFIX[tipeAkun];
    const subPrefix = KATEGORI_SUBPREFIX[kategori] || '99';
    
    // Format dasar: PREFIX-SUBPREFIXXX
    const baseCode = `${prefix}-${subPrefix}`;
    
    // Cari kode terakhir dengan prefix yang sama
    const lastAkun = await Akun.findOne({
      kodeAkun: { $regex: `^${baseCode}` }
    }).sort({ kodeAkun: -1 });

    let newNumber = 1;
    
    if (lastAkun) {
      // Extract nomor terakhir dari kode
      // Contoh: "1-1105" -> ambil "05" -> convert ke number -> +1
      const lastCode = lastAkun.kodeAkun;
      const lastNumber = parseInt(lastCode.split('-')[1].slice(2)) || 0;
      newNumber = lastNumber + 1;
    }

    // Format nomor dengan padding (01, 02, 03, ...)
    const paddedNumber = String(newNumber).padStart(2, '0');
    
    // Generate kode final
    const kodeAkun = `${baseCode}${paddedNumber}`;
    
    return kodeAkun;
  } catch (error) {
    throw new Error(`Gagal generate kode akun: ${error.message}`);
  }
};

/**
 * Generate kode akun dengan custom format
 * Untuk kasus khusus yang tidak mengikuti pola standard
 * 
 * @param {string} tipeAkun 
 * @param {string} customPrefix - Custom prefix (contoh: "1101", "2201")
 * @returns {Promise<string>}
 */
export const generateKodeAkunCustom = async (tipeAkun, customPrefix) => {
  try {
    const prefix = TIPE_AKUN_PREFIX[tipeAkun];
    const baseCode = `${prefix}-${customPrefix}`;
    
    // Cari kode terakhir
    const lastAkun = await Akun.findOne({
      kodeAkun: { $regex: `^${baseCode}` }
    }).sort({ kodeAkun: -1 });

    let newNumber = 1;
    
    if (lastAkun) {
      const lastCode = lastAkun.kodeAkun;
      const parts = lastCode.split('-');
      if (parts[1]) {
        const lastNumber = parseInt(parts[1].slice(customPrefix.length)) || 0;
        newNumber = lastNumber + 1;
      }
    }

    const paddedNumber = String(newNumber).padStart(2, '0');
    const kodeAkun = `${baseCode}${paddedNumber}`;
    
    return kodeAkun;
  } catch (error) {
    throw new Error(`Gagal generate kode akun custom: ${error.message}`);
  }
};

/**
 * Validasi format kode akun
 * 
 * @param {string} kodeAkun 
 * @returns {boolean}
 */
export const validateKodeAkun = (kodeAkun) => {
  // Format: X-XXXX atau X-XXXXX
  const regex = /^[1-5]-\d{4,5}$/;
  return regex.test(kodeAkun);
};

/**
 * Get tipe akun dari kode akun
 * 
 * @param {string} kodeAkun 
 * @returns {string|null}
 */
export const getTipeFromKode = (kodeAkun) => {
  const prefix = kodeAkun.charAt(0);
  const tipeMap = {
    '1': 'aset',
    '2': 'liabilitas',
    '3': 'ekuitas',
    '4': 'pendapatan',
    '5': 'beban'
  };
  return tipeMap[prefix] || null;
};

/**
 * Get saldo normal dari tipe akun
 * 
 * @param {string} tipeAkun 
 * @returns {string}
 */
export const getSaldoNormal = (tipeAkun) => {
  const saldoMap = {
    'aset': 'debit',
    'beban': 'debit',
    'liabilitas': 'kredit',
    'ekuitas': 'kredit',
    'pendapatan': 'kredit'
  };
  return saldoMap[tipeAkun] || 'debit';
};

// ==================== CONTOH PENGGUNAAN ====================

/**
 * Contoh 1: Generate kode otomatis
 */
/*
const kode1 = await generateKodeAkun('aset', 'kas');
// Result: "1-1101" (jika belum ada)
// Result: "1-1102" (jika 1-1101 sudah ada)

const kode2 = await generateKodeAkun('liabilitas', 'hutang');
// Result: "2-2101"

const kode3 = await generateKodeAkun('pendapatan', 'penjualan');
// Result: "4-4101"
*/

/**
 * Contoh 2: Generate dengan custom prefix
 */
/*
const kode = await generateKodeAkunCustom('aset', '1150');
// Result: "1-115001", "1-115002", dst
*/

/**
 * Contoh 3: Validasi kode
 */
/*
validateKodeAkun('1-1101'); // true
validateKodeAkun('1-11011'); // true
validateKodeAkun('6-1101'); // false (prefix harus 1-5)
validateKodeAkun('1-11'); // false (min 4 digit)
*/

// ==================== EXPORT ====================
export default {
  generateKodeAkun,
  generateKodeAkunCustom,
  validateKodeAkun,
  getTipeFromKode,
  getSaldoNormal,
  TIPE_AKUN_PREFIX,
  KATEGORI_SUBPREFIX
};