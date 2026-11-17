import { Router } from 'express';
import { z } from 'zod';
import { updatePassword, updateProfile } from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter, authLimiter } from '../middleware/rateLimiters.js';
import { changePasswordSchema, updateProfileSchema } from '../validators/authValidators.js';
import { deleteAccount, exportAccount } from '../services/accountService.js';
import { clearSessionCookie } from '../services/tokenService.js';
import { sendSuccess } from '../utils/response.js';
import { toDateOnly, todayUtc } from '../utils/dates.js';

const router = Router();

router.use(requireAuth);

router.patch('/me', validate({ body: updateProfileSchema }), updateProfile);
router.patch('/me/password', authLimiter, validate({ body: changePasswordSchema }), updatePassword);

// Download everything stored about the account as JSON (rate-limited: it's a heavy query).
router.get('/me/export', aiLimiter, async (req, res) => {
  const data = await exportAccount(req.user);
  res.set({
    'Content-Disposition': `attachment; filename="spendflow-export-${toDateOnly(todayUtc())}.json"`,
    'Cache-Control': 'no-store',
  });
  res.json(data);
});

// Permanent deletion requires the password and typing DELETE.
const deleteSchema = z.object({
  password: z.string().min(1, 'Enter your password').max(200),
  confirm: z.literal('DELETE', { error: 'Type DELETE to confirm' }),
});

router.delete('/me', authLimiter, validate({ body: deleteSchema }), async (req, res) => {
  const deleted = await deleteAccount(req.userId, req.body.password);
  clearSessionCookie(res);
  sendSuccess(res, { deleted: true, records: deleted });
});

export default router;
