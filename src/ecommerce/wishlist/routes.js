import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  cartToWishlist
} from "./controller/index.js";
import { authenticate } from "../auth/index.js";

const router = express.Router();

router.get("/", authenticate, getWishlist);
router.post("/add", authenticate, addToWishlist);
router.post("/remove", authenticate, removeFromWishlist);
router.delete("/clear", authenticate, clearWishlist);
router.post("/cart-to-wishlist", authenticate, cartToWishlist);

export default router;
