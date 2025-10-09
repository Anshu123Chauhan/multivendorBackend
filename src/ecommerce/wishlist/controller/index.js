import { Cart } from "../../../models/cart.js";
import Wishlist from "../../../models/wishlist.js";
import { isSameVariant } from "../../../utils/variantHelper.js";

export const getWishlist = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Login required" });

    let wishlist = await Wishlist.findOne({ customerId: req.user._id });
    if (!wishlist) wishlist = { items: [] };

    res.json({ success: true, wishlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addToWishlist = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Login required" });

    const { productId, name, price, image, description, variant } = req.body;

    let wishlist = await Wishlist.findOne({ customerId: req.user._id });
    if (!wishlist) {
      wishlist = new Wishlist({ customerId: req.user._id, items: [] });
    }

    const existingItem = wishlist.items.find(i =>
      i.productId.toString() === productId && isSameVariant(i.variant, variant)
    );

    if (existingItem) {
      return res.status(400).json({ error: "Item already in wishlist" });
    }

    wishlist.items.push({
      productId,
      name,
      price,
      image: image || null,
      description: description || null,
      variant: variant || null,
    });

    await wishlist.save();
    res.json({ success: true, wishlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Login required" });

    const { productId, variant } = req.body;

    let wishlist = await Wishlist.findOne({ customerId: req.user._id });
    if (!wishlist) return res.status(404).json({ error: "Wishlist not found" });

    wishlist.items = wishlist.items.filter(
      i => !(i.productId.toString() === productId && isSameVariant(i.variant, variant))
    );

    await wishlist.save();
    res.json({ success: true, wishlist });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const clearWishlist = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Login required" });

    const wishlist = await Wishlist.findOneAndDelete({ customerId: req.user._id });
    if (!wishlist) return res.status(404).json({ error: "Wishlist not found" });

    res.json({ success: true, message: "wishlist cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const cartToWishlist = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Login required" });

    const { productId, variant } = req.body;

    const cart = await Cart.findOne({ customerId: req.user._id, status: "active" });
    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const itemIndex = cart.items.findIndex(
      (i) => i.productId.toString() === productId && isSameVariant(i.variant, variant)
    );
    if (itemIndex === -1)
      return res.status(404).json({ error: "Item not found in cart" });

    let wishlist = await Wishlist.findOne({ customerId: req.user._id });
    if (!wishlist) {
      wishlist = new Wishlist({ customerId: req.user._id, items: [] });
    }

    const alreadyInWishlist = wishlist.items.some(
      (i) => i.productId.toString() === productId && isSameVariant(i.variant, variant)
    );
    if (alreadyInWishlist) {
      return res.status(200).json({ error: "Item already in wishlist" });
    }

    const cartItem = cart.items[itemIndex];
    wishlist.items.push({
      productId: cartItem.productId,
      name: cartItem.name,
      price: cartItem.price,
      image: cartItem.image || null,
      description: cartItem.description || null,
      variant: cartItem.variant || null,
    });

    cart.items.splice(itemIndex, 1);

    await Promise.all([cart.save(), wishlist.save()]);

    res.json({ success: true, wishlist, cart });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
