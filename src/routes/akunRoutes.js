import { akunController } from "../controllers/akunController.js"
import express from "express"

export const router = express.Router()

/**
 * GET /api/akun - Get all akun
 * Query params: ?tipeAkun=aset&kategori=kas&aktif=true
 */
router.get('/akun', akunController.getAll);

/**
 * GET /api/akun/:id - Get akun by ID
 */
router.get('/akun/:id', akunController.getById);

/**
 * POST /api/akun - Create new akun
 * Body: { kodeAkun, namaAkun, tipeAkun, kategori, saldoNormal, saldoAwal }
 */
router.post('/akun', akunController.create);

/**
 * PUT /api/akun/:id - Update akun
 * Body: { namaAkun, kategori, saldoAwal, aktif, deskripsi }
 */
router.put('/akun/:id', akunController.update);

/**
 * DELETE /api/akun/:id - Delete akun
 */
router.delete('/akun/:id', akunController.delete);