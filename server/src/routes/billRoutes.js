import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import {
  billListQuery,
  createBillSchema,
  createSubscriptionSchema,
  notificationQuery,
  payBillSchema,
  updateSubscriptionSchema,
} from '../validators/billValidators.js';
import * as bills from '../services/billService.js';
import * as notifications from '../services/notificationService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export const subscriptionRoutes = Router();
subscriptionRoutes.use(requireAuth);
subscriptionRoutes.get('/', async (req, res) => sendSuccess(res, { items: await bills.listSubscriptions(req.userId) }));
subscriptionRoutes.post('/', validate({ body: createSubscriptionSchema }), async (req, res) =>
  sendCreated(res, { subscription: await bills.createSubscription(req.userId, req.body) }),
);
subscriptionRoutes.get('/:id/history', validate({ params: idParams }), async (req, res) =>
  sendSuccess(res, await bills.subscriptionHistory(req.userId, req.params.id)),
);
subscriptionRoutes.patch('/:id', validate({ params: idParams, body: updateSubscriptionSchema }), async (req, res) =>
  sendSuccess(res, { subscription: await bills.updateSubscription(req.userId, req.params.id, req.body) }),
);
subscriptionRoutes.delete('/:id', validate({ params: idParams }), async (req, res) => {
  await bills.deleteSubscription(req.userId, req.params.id);
  sendSuccess(res, { deleted: true });
});

export const billRoutes = Router();
billRoutes.use(requireAuth);
billRoutes.get('/', validate({ query: billListQuery }), async (req, res) => sendSuccess(res, { items: await bills.listBills(req.userId, req.validatedQuery) }));
billRoutes.get('/summary', async (req, res) => sendSuccess(res, await bills.billsSummary(req.userId)));
billRoutes.post('/', validate({ body: createBillSchema }), async (req, res) => sendCreated(res, { bill: await bills.createOneOffBill(req.userId, req.body) }));
billRoutes.post('/:id/pay', validate({ params: idParams, body: payBillSchema }), async (req, res) =>
  sendSuccess(res, await bills.payBill(req.userId, req.params.id, req.body)),
);
billRoutes.post('/:id/skip', validate({ params: idParams }), async (req, res) => sendSuccess(res, { bill: await bills.skipBill(req.userId, req.params.id) }));
billRoutes.post('/:id/reopen', validate({ params: idParams }), async (req, res) => sendSuccess(res, { bill: await bills.reopenBill(req.userId, req.params.id) }));
billRoutes.delete('/:id', validate({ params: idParams }), async (req, res) => {
  await bills.deleteBill(req.userId, req.params.id);
  sendSuccess(res, { deleted: true });
});

export const notificationRoutes = Router();
notificationRoutes.use(requireAuth);
notificationRoutes.get('/', validate({ query: notificationQuery }), async (req, res) =>
  sendSuccess(res, await notifications.listNotifications(req.user, req.validatedQuery)),
);
notificationRoutes.post('/read-all', async (req, res) => sendSuccess(res, await notifications.markAllRead(req.userId)));
notificationRoutes.patch('/:id/read', validate({ params: idParams }), async (req, res) =>
  sendSuccess(res, { notification: await notifications.markRead(req.userId, req.params.id) }),
);
notificationRoutes.delete('/:id', validate({ params: idParams }), async (req, res) => {
  await notifications.deleteNotification(req.userId, req.params.id);
  sendSuccess(res, { deleted: true });
});
