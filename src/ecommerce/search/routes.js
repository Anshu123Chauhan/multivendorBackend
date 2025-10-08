import express from "express";
import { aiProductSearch } from "./controller/index.js";

const router = express.Router();

router.post("/aisearch", aiProductSearch);

export default router;
