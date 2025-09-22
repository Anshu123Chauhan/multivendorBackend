// routes/attribute.routes.js
import express from "express";
import {
  createAttribute,
  getAttributes,
  getAttributeById,
  updateAttribute,
  deleteAttribute,
  restoreAttribute,
  bulkCreateAttributes
} from "./controller/index.js";

const router = express.Router();

router.post("/", createAttribute);
router.get("/", getAttributes);
router.get("/:id", getAttributeById);
router.put("/:id", updateAttribute);
router.delete("/:id", deleteAttribute);
router.patch("/:id", restoreAttribute);
router.post("/bulk",bulkCreateAttributes);

export default router;
