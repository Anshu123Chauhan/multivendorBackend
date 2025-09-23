// routes/attribute.routes.js
import express from "express";
import {
  createAttribute,
  getAttributes,
  getAttributeById,
  updateAttribute,
  deleteAttribute,
  restoreAttribute,
  // bulkCreateAttributes,
  bulkUpsertAttributes,
  deleteAttributeValue,
  restoreAttributeValue
} from "./controller/index.js";

const router = express.Router();

router.post("/", createAttribute);
router.get("/", getAttributes);
router.get("/:id", getAttributeById);
router.put("/:id", updateAttribute);
router.delete("/:id", deleteAttribute);
router.patch("/:id", restoreAttribute);
// router.post("/bulk",bulkCreateAttributes);
router.post('/bulkupdate',bulkUpsertAttributes)
router.delete('/:attributeId/values/:valueId',deleteAttributeValue)
router.patch('/:attributeId/values/:valueId/restore',restoreAttributeValue)

export default router;
