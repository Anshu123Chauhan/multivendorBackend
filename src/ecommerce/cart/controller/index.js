import {Cart} from "../../../models/cart.js";
import { Product } from "../../../models/Product.js";
import { isSameVariant } from "../../../utils/variantHelper.js";
import Wishlist from "../../../models/wishlist.js";

const getCartByOwner = async (req) => {
  if (req.user) {
    return await Cart.findOne({ customerId: req.user._id, status: "active" });
  } else if (req.sessionId) {
    return await Cart.findOne({ sessionId: req.sessionId, status: "active" });
  }
  throw new Error("No customerId or sessionId provided");
};

export const addToCart = async (req, res) => {
  try {
    const { productId, name, price, quantity, variant, description, image } = req.body;
    let cart = await getCartByOwner(req);
    const productDetail = await Product.findById(productId);
    if (!cart) {
      cart = new Cart({
        customerId: req.user ? req.user._id : undefined,
        sessionId: req.sessionId || undefined,
        items: [],
      });
    }

    const existingItem = cart.items.find(item => {
      return (
        item.productId.toString() === productId &&
        isSameVariant(item.variant, variant)
      );
    });

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.total = existingItem.price * existingItem.quantity;
    } else {
      cart.items.push({
        productId,
        name,
        price,
        quantity,
        variant: variant || null,
        image: image || null,
        description,
        total: price * quantity,
        parent_type: productDetail.parent_type,
        parent_id: productDetail.parent_id
      });
    }

    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getCart = async (req, res) => {
  try {
    const cart = await getCartByOwner(req);
    if (!cart) return res.json({ success: true, cart: { items: [] } });
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity, variant } = req.body;
    let cart = await getCartByOwner(req);

    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const item = cart.items.find(i => {
      return (
        i.productId.toString() === productId &&
        isSameVariant(i.variant, variant)
      );
    });

    if (!item) return res.status(404).json({ error: "Item not found in cart" });

    if (quantity <= 0) {
      cart.items = cart.items.filter(i => {
        return !(
          i.productId.toString() === productId &&
          isSameVariant(i.variant, variant)
        );
      });
    } else {
      item.quantity = quantity;
      item.total = item.price * quantity;
    }

    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const removeCartItem = async (req, res) => {
  try {
    const { productId, variant } = req.body;
    let cart = await getCartByOwner(req);

    if (!cart) return res.status(404).json({ error: "Cart not found" });    

    cart.items = cart.items.filter(i => {
      return !(
        i.productId.toString() === productId &&
        isSameVariant(i.variant, variant)
      );
    });

    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const clearCart = async (req, res) => {
  try {
    let cart = await getCartByOwner(req);

    if (!cart) return res.status(404).json({ error: "Cart not found" });

    cart.items = [];
    await cart.save();
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const wishlistToCart = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Login required" });

    const { productId, variant } = req.body;

    const wishlist = await Wishlist.findOne({ customerId: req.user._id });
    if (!wishlist) return res.status(404).json({ error: "Wishlist not found" });

    const itemIndex = wishlist.items.findIndex(
      (i) => i.productId.toString() === productId && isSameVariant(i.variant, variant)
    );
    if (itemIndex === -1)
      return res.status(404).json({ error: "Item not found in wishlist" });

    let cart = await Cart.findOne({ customerId: req.user._id, status: "active" });
    if (!cart) {
      cart = new Cart({ customerId: req.user._id, items: [], status: "active" });
    }

    const existingItem = cart.items.find(
      (i) => i.productId.toString() === productId && isSameVariant(i.variant, variant)
    );

    if (existingItem) {
      return res.status(400).json({ error: "Item already in cart" });
    }

    const wishlistItem = wishlist.items[itemIndex];
    cart.items.push({
      productId: wishlistItem.productId,
      name: wishlistItem.name,
      price: wishlistItem.price,
      image: wishlistItem.image || null,
      description: wishlistItem.description || null,
      variant: wishlistItem.variant || null,
      quantity: 1,
    });

    wishlist.items.splice(itemIndex, 1);

    await Promise.all([cart.save(), wishlist.save()]);

    res.json({ success: true, cart, wishlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};