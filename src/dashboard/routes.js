import express from 'express';
import admin from './admin/routes.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use('/admin', authenticate, admin);

export default router;