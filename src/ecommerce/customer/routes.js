import express from 'express';
import { authenticate } from '../auth/index.js';
import { customerRegister, login, sentOtp, updateForgetPassword, customerPasswordUpdate, verifyOtp } from './controller/index.js';
const router = express.Router();

router.post('/auth/login', login);
router.post('/register', customerRegister);
router.post('/update-password', authenticate, customerPasswordUpdate);
router.post('/forget-password', updateForgetPassword);
router.post('/send-otp', sentOtp);
router.post('/verify-otp', verifyOtp);

export default router;