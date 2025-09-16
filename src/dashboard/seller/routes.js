import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { sellerUserRegister, sellerUserUpdate, sellerRegister } from './controller/index.js';

const router = express.Router();

router.post('/user', authenticate, sellerUserRegister);
router.post('/register',sellerRegister)
router.post('/role/:roleId/permission', authenticate, sellerUserUpdate);

export default router;

