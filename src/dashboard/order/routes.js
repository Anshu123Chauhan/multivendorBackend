import express from 'express'
import {getOrders,getOrderById, updateOrderTracking} from './controller/index.js'
const router = express.Router();

router.get('/',getOrders);
router.get('/:id',getOrderById);
router.put('/tracking/:id',updateOrderTracking);


export default router