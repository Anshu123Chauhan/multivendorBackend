import express from 'express';
import { productsListing, productDetails, categoryListing } from './controller/index.js'
const router = express.Router();

router.post('/listing',productsListing);
router.get('/categoryListing',categoryListing);
router.get('/:id', productDetails);

export default router;