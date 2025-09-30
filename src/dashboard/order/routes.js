import express from 'express'
import {getOrders} from './controller/index'
const router = express.Router();

router.get('/',getOrders);

export default router