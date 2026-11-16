import { Router } from 'express';
import * as controller from '../controllers/aiController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimiters.js';
import { idParams } from '../validators/common.js';
import { chatSchema, parseTransactionSchema, summaryQuery } from '../validators/aiValidators.js';

const router = Router();
router.use(requireAuth);

router.get('/status', aiLimiter, controller.status);
router.get('/summary', aiLimiter, validate({ query: summaryQuery }), controller.summary);
router.post('/chat', aiLimiter, validate({ body: chatSchema }), controller.chat);
router.post('/parse-transaction', aiLimiter, validate({ body: parseTransactionSchema }), controller.parseTransaction);
router.get('/conversations', controller.conversations);
router.get('/conversations/:id', validate({ params: idParams }), controller.conversation);
router.delete('/conversations/:id', validate({ params: idParams }), controller.removeConversation);

export default router;
