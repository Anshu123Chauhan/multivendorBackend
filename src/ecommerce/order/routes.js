import express from "express";
import { placeOrder } from "./controller/index.js";

const router = express.Router();

router.post("/place", placeOrder);

export default router;