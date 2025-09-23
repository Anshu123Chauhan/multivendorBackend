import express from 'express';
import { authenticate } from '../auth/index.js';
import { customerRegister, login, customerPasswordUpdate } from './controller/index.js';
const router = express.Router();

router.post('/auth/login', login);
router.post('/register', customerRegister);
router.post('/update-password', authenticate, customerPasswordUpdate);

export default router;