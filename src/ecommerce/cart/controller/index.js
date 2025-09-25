import Cart from "../../../models/cart.js";

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
    const { productId, name, price, quantity } = req.body;
    let cart = await getCartByOwner(req);

    if (!cart) {
      cart = new Cart({
        customerId: req.user ? req.user._id : undefined,
        sessionId: req.sessionId || undefined,
        items: [],
      });
    }

    const existingItem = cart.items.find(
      (item) => item.productId.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.total = existingItem.price * existingItem.quantity;
    } else {
      cart.items.push({ productId, name, price, quantity });
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
    const { productId, quantity } = req.body;
    let cart = await getCartByOwner(req);

    if (!cart) return res.status(404).json({ error: "Cart not found" });

    const item = cart.items.find(
      (i) => i.productId.toString() === productId
    );

    if (!item) return res.status(404).json({ error: "Item not found in cart" });

    if (quantity <= 0) {
      cart.items = cart.items.filter(
        (i) => i.productId.toString() !== productId
      );
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
    const { productId } = req.body;
    let cart = await getCartByOwner(req);

    if (!cart) return res.status(404).json({ error: "Cart not found" });

    cart.items = cart.items.filter(
      (i) => i.productId.toString() !== productId
    );

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
