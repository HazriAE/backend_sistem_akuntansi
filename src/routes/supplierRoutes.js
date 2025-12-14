import express from 'express';
import { SupplierController } from '../controllers/supplierController.js';

const router = express.Router();

router.post('/supplier', SupplierController.create);
router.get('/supplier', SupplierController.getAll);
router.get('/supplier/:id', SupplierController.getById);
router.put('/supplier/:id', SupplierController.update);
router.delete('/supplier/:id', SupplierController.remove);

export default router;
