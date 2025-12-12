import { kontakController } from "../controllers/kontakController.js"
import express from "express"

export const kontakRouter = express.Router()
/**
 * GET /api/kontak - Get all kontak
 * Query params: ?tipe=customer&aktif=true&search=nama
 */
kontakRouter.get('/kontak', kontakController.getAll);

/**
 * GET /api/kontak/:id - Get kontak by ID
 */
kontakRouter.get('/kontak/:id', kontakController.getById);

/**
 * POST /api/kontak - Create new kontak
 * Body: { kode, nama, tipe, noHp, alamat, email }
 */
kontakRouter.post('/kontak', kontakController.create);

/**
 * PUT /api/kontak/:id - Update kontak
 * Body: { nama, noHp, alamat, email, aktif }
 */
kontakRouter.put('/kontak/:id', kontakController.update);

/**
 * DELETE /api/kontak/:id - Delete kontak
 */
kontakRouter.delete('/kontak/:id', kontakController.delete);

