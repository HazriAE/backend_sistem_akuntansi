import { akunController } from "../controllers/akunController.js"
import express from "express"

export const akunRouter = express.Router()

/**
 * GET /api/akun - Get all akun
 * Query params: ?tipeAkun=aset&kategori=kas&aktif=true
 */
akunRouter.get('/akun', akunController.getAll);

/**
 * GET /api/akun/:id - Get akun by ID
 */
akunRouter.get('/akun/:id', akunController.getById);

/**
 * POST /api/akun - Create new akun
 * Body: { kodeAkun, namaAkun, tipeAkun, kategori, saldoNormal, saldoAwal }
 */
akunRouter.post('/akun', akunController.create);

/**
 * PUT /api/akun/:id - Update akun
 * Body: { namaAkun, kategori, saldoAwal, aktif, deskripsi }
 */
akunRouter.put('/akun/:id', akunController.update);

/**
 * DELETE /api/akun/:id - Delete akun
 */
akunRouter.delete('/akun/:id', akunController.delete);