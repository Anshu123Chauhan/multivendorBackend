import express from 'express';
import auth from './auth/routes.js';
import admin from './admin/routes.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use('/auth', auth);
router.use('/admin', authenticate, admin);

export default router;