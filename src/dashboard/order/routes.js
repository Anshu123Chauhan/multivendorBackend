import express from 'express'
import {getOrders} from './controller/index.js'
const router = express.Router();

router.get('/',getOrders);

export default router