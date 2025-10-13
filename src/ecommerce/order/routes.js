import express from "express";
import { placeOrder, getCustomerOrders, customerOrder } from "./controller/index.js";


const router = express.Router();

router.post("/place", placeOrder);
router.get("/list",getCustomerOrders)
router.get("/:id",customerOrder)

export default router;