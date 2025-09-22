import express from 'express';
import { productFetch, productFilter } from './controller/index.js'
const router = express.Router();

router.get('/api/products',productFetch);
router.get('/api/products/filters',productFilter)

export default router;