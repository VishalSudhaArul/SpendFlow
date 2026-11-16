import { Router } from 'express';
import * as controller from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { analyticsQuery, cashflowQuery, heatmapQuery, unusualQuery } from '../validators/analyticsValidators.js';

export const dashboardRoutes = Router();
dashboardRoutes.use(requireAuth);
dashboardRoutes.get('/', controller.dashboard);

export const analyticsRoutes = Router();
analyticsRoutes.use(requireAuth);
analyticsRoutes.get('/overview', validate({ query: analyticsQuery }), controller.overview);
analyticsRoutes.get('/report', validate({ query: analyticsQuery }), controller.report);
analyticsRoutes.get('/heatmap', validate({ query: heatmapQuery }), controller.heatmap);
analyticsRoutes.get('/unusual', validate({ query: unusualQuery }), controller.unusual);
analyticsRoutes.get('/cashflow', validate({ query: cashflowQuery }), controller.cashflow);
