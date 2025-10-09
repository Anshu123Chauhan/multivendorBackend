import express from "express";
import { addToCart, getCart, updateCartItem, removeCartItem, clearCart, wishlistToCart
} from "./controller/index.js";
import { authenticate } from "../auth/index.js";

const router = express.Router();

router.post("/add", addToCart);
router.get("/list", getCart);
router.put("/update", updateCartItem);
router.delete("/remove", removeCartItem);
router.delete("/clear", clearCart);
router.post("/wishlist-to-cart", authenticate, wishlistToCart);

export default router;
