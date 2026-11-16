import { Router } from 'express';
import { getHealth } from '../controllers/healthController.js';

const router = Router();

router.get('/health', getHealth);

// Feature routers are mounted here as each phase lands:
// router.use('/auth', authRoutes);
// router.use('/transactions', transactionRoutes);

export default router;
