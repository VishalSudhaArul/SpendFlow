import express from 'express';
import {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  changePassword,
  completeOnboarding,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/onboarding', protect, completeOnboarding);

export default router;
