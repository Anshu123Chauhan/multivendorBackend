import express from 'express';
import { authenticate } from '../auth/index.js';
import { customerRegister, customerDetail, login, sentOtp, updateForgetPassword, customerPasswordUpdate, verifyOtp,
    addAddress, updateAddress, removeAddress } from './controller/index.js';

const router = express.Router();

router.post('/auth/login', login);
router.post('/register', customerRegister);
router.post('/detail/:id', authenticate, customerDetail);
router.post('/update-password', authenticate, customerPasswordUpdate);
router.post('/forget-password', updateForgetPassword);
router.post('/send-otp', sentOtp);
router.post('/verify-otp', verifyOtp);
router.post('/address/add', authenticate, addAddress);
router.put('/address/update/:id', authenticate, updateAddress);
router.delete('/address/remove/:id', authenticate, removeAddress);

export default router;