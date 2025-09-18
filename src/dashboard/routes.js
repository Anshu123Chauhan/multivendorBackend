import express from 'express';
import auth from './auth/routes.js';
import admin from './admin/routes.js';
import seller from './seller/routes.js';
import { authenticate } from '../middleware/auth.js';
import category from './category/routers.js'
import brand from './brand/routes.js'
import product from './product/routes.js'

const router = express.Router();
router.use('/auth', auth);
router.use('/admin', authenticate, admin);
router.use('/seller', seller);
router.use('/admin/category', authenticate, category)
router.use('/admin/brand', authenticate, brand)
router.use('/admin/product',authenticate, product)


export default router;