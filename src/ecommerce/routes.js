import express from 'express';
import customer from './customer/routes.js';
import product from './product/routes.js'
import cart from './cart/routes.js'
import { guestSession } from "./auth/index.js";

const router = express.Router();

router.use('/customer', customer);
router.use('/product', product);
router.use('/cart', guestSession, cart);

export default router;