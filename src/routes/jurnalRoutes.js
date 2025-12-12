import { jurnalController } from "../controllers/jurnalController.js";
import express from "express"

export const jurnalRouter = express.Router()

jurnalRouter.get('/jurnal/generate-number', jurnalController.generateNumber);
/**
 * GET /api/jurnal - Get all jurnal entries
 * Query params: ?status=posted&jenisTransaksi=penjualan&startDate=2024-01-01&endDate=2024-12-31
 */
jurnalRouter.get('/jurnal', jurnalController.getAll);

/**
 * GET /api/jurnal/:id - Get jurnal by ID
 */
jurnalRouter.get('/jurnal/:id', jurnalController.getById);

/**
 * POST /api/jurnal - Create new jurnal entry
 * Body: {
 *   nomorJurnal,
 *   tanggal,
 *   deskripsi,
 *   jenisTransaksi,
 *   referensi: { tipe, id },
 *   items: [{ akun, debit, kredit, keterangan }]
 * }
 */
jurnalRouter.post('/jurnal', jurnalController.create);

/**
 * PUT /api/jurnal/:id - Update jurnal (only draft)
 * Body: same as create
 */
jurnalRouter.put('/jurnal/:id', jurnalController.update);

/**
 * POST /api/jurnal/:id/post - Post jurnal (draft -> posted)
 */
jurnalRouter.post('/jurnal/:id/post', jurnalController.post);

/**
 * POST /api/jurnal/:id/void - Void jurnal
 */
jurnalRouter.post('/jurnal/:id/void', jurnalController.void);

/**
 * DELETE /api/jurnal/:id - Delete jurnal (only draft)
 */
jurnalRouter.delete('/jurnal/:id', jurnalController.delete);

