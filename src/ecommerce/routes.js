import express from 'express';
import customer from './customer/routes.js';
const router = express.Router();

router.use('/customer', customer);

export default router;