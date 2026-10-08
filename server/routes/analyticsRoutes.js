import express from 'express';
import {
  getDashboardSummary,
  getHealthScore,
  getSafeToSpend,
  getTrends,
  getHeatmap,
  getMerchantStats,
  getCategoryDrilldown,
  getSpendingForecast,
  getAnomalies,
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard-summary', getDashboardSummary);
router.get('/health-score', getHealthScore);
router.get('/safe-to-spend', getSafeToSpend);
router.get('/trends', getTrends);
router.get('/heatmap', getHeatmap);
router.get('/merchants', getMerchantStats);
router.get('/category/:category', getCategoryDrilldown);
router.get('/forecast', getSpendingForecast);
router.get('/anomalies', getAnomalies);

export default router;
