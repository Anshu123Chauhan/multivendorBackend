import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variant: { type: Object},
  description: { type: String },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  total: { type: Number, required: true, min: 0 },
}, { _id:false });

cartItemSchema.pre("validate", function (next) {
  this.total = this.price * this.quantity;
  next();
});

const cartSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: false,
  },
  sessionId: {
    type: String,
    required: false,
  },
  items: [cartItemSchema],
  totalPrice: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ["active", "ordered", "abandoned"],
    default: "active",
  }
}, { timestamps: true });

cartSchema.pre("save", function (next) {
  this.totalPrice = this.items.reduce((sum, item) => sum + item.total, 0);
  next();
});

const Cart = mongoose.model("Cart", cartSchema);
export default Cart;
