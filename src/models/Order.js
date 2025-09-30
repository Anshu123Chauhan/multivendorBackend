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
sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true },
customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true }, 
items: [OrderItemSchema],
subtotal: { type: Number, default: 0 },
shippingMethod: { type: String, enum: ['standard','express','same_day'], default: 'standard' },
shippingCost: Number,
shippingAddress: AddressEmbed,
paymentMethod: {type:String,enum: ['card','upi','wallet','netbanking','cod']},
paymentStatus: {type:String,enum: ['pending','paid','failed','not_required'],default: 'pending'},
ourPaymentTransactionId: String,
total: Number,
status: { type: String, enum: ['placed','paid','shipped','delivered','cancelled'], default: 'placed' }
}, { timestamps: true });


export const Order= mongoose.model('Order', OrderSchema);