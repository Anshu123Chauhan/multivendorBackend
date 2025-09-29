import mongoose from 'mongoose'

const OrderItemSchema = new mongoose.Schema({
productId: String,
name: String,
qty: Number,
price: Number
}, { _id: false });


const AddressEmbed = new mongoose.Schema({
label: String,
recipientName: String,
phone: String,
street: String,
city: String,
state: String,
country: String,
pincode: String
}, { _id: false });


const OrderSchema = new mongoose.Schema({
orderNumber: { type: String, required: true, unique: true },
userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
items: [OrderItemSchema],
subtotal: Number,
shippingMethod: String,
shippingCost: Number,
shippingAddress: AddressEmbed,
paymentMethod: String,
paymentStatus: String,
paymentTransactionId: String,
total: Number,
status: { type: String, enum: ['placed','paid','shipped','delivered','cancelled'], default: 'placed' }
}, { timestamps: true });


export const Order= mongoose.model('Order', OrderSchema);