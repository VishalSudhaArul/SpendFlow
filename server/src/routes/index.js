import { Router } from 'express';
import { getHealth } from '../controllers/healthController.js';
import { getMeta } from '../controllers/metaController.js';
import { requireAuth } from '../middleware/auth.js';
import authRoutes from './authRoutes.js';
import userRoutes from './userRoutes.js';
import transactionRoutes from './transactionRoutes.js';
import incomeRoutes from './incomeRoutes.js';
import { budgetRoutes, goalRoutes } from './planningRoutes.js';
import { analyticsRoutes, dashboardRoutes } from './analyticsRoutes.js';

const router = Router();

router.get('/health', getHealth);
router.get('/meta', requireAuth, getMeta);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/transactions', transactionRoutes);
router.use('/income', incomeRoutes);
router.use('/budgets', budgetRoutes);
router.use('/goals', goalRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
