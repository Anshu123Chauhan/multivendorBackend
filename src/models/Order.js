import mongoose from 'mongoose'

const OrderItemSchema = new mongoose.Schema({
productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true },
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
orderNumber: { type: String, required: true },
customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true }, // staff/seller
sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller", required: true }, // seller 
items: [OrderItemSchema],
subtotal: { type: Number, default: 0 },
shippingMethod: { type: String, enum: ['standard','express','same_day'], default: 'standard' },
shippingCost: Number,
shippingAddress: AddressEmbed,
paymentMethod: {type:String,enum: ['card','upi','wallet','netbanking','cod']},
paymentStatus: {type:String,enum: ['pending','paid','failed','not_required'],default: 'pending'},
ourPaymentTransactionId: String,
total: Number,
orderTracking: {
  placed: Date,
  shipped: Date,
  delivered: Date,
  cancelled: Date,
  out_for_delivery: Date
},
trackingUrl: String,
status: { type: String, enum: ['placed','paid','out_for_delivery','shipped','delivered','cancelled'], default: 'placed' }
}, { timestamps: true });


export const Order= mongoose.model('Order', OrderSchema);
