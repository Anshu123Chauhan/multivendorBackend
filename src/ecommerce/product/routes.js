import express from 'express';
import { productFetch, productFilter, productDetails } from './controller/index.js'
const router = express.Router();

router.get('/products',productFetch);
router.get('/products/filters',productFilter);
router.get('/products/', productDetails);

export default router;