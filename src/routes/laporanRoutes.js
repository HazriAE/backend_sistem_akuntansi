import { labaRugiMultipleStepController } from "../controllers/labaRugiMultipleStepController.js";
import { laporanController } from "../controllers/laporanController.js"
import express from "express"

export const router = express.Router()

/**
 * GET /api/laporan/jurnal-umum - Jurnal Umum
 * Query params: ?startDate=2024-01-01&endDate=2024-12-31
 */
router.get('/laporan/jurnal-umum', laporanController.jurnalUmum);

/**
 * GET /api/laporan/buku-besar - Buku Besar per Akun
 * Query params: ?akunId=xxx&startDate=2024-01-01&endDate=2024-12-31
 */
router.get('/laporan/buku-besar', laporanController.bukuBesar);
router.get("/laporan/buku-besar-all", laporanController.bukuBesarAll)


/**
 * GET /api/laporan/neraca-saldo - Neraca Saldo / Trial Balance
 * Query params: ?endDate=2024-12-31
 */
router.get('/laporan/neraca-saldo', laporanController.neracaSaldo);

/**
 * GET /api/laporan/laba-rugi - Laporan Laba Rugi
 * Query params: ?startDate=2024-01-01&endDate=2024-12-31
 */
router.get('/laporan/laba-rugi', laporanController.labaRugi);

router.get('/laporan/laba-rugi-multiple-step', labaRugiMultipleStepController);


/**
 * GET /api/laporan/neraca - Neraca / Balance Sheet
 * Query params: ?endDate=2024-12-31
 */
router.get('/laporan/neraca', laporanController.neraca);


router.get('/laporan/perubahan-equitas', laporanController.perubahanEkuitas);


router.get('/laporan/arus-kas', laporanController.arusKas);
