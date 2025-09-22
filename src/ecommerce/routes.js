import express from 'express';
import customer from './customer/routes.js';
import product from './product/routes.js'
const router = express.Router();

router.use('/customer', customer);
router.use('/ui', product);


export default router;