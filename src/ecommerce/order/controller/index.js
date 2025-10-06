// controllers/orderController.js
import { Order,OrderParent } from "../../../models/Order.js";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import {sendMail} from '../../../middleware/sendMail.js'
import { Cart } from "../../../models/cart.js";

export const placeOrder = async (req, res) => {
  try {
    const {
      orderNumber,
      items,
      shippingAddress,
      paymentMethod,
      shippingMethod,
      shippingCost,
      status,
      total,
    } = req.body;
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!token)
      return res.status(401).json({
        sucess: false,
        meaasge: "Token is Missing",
      });
    const userId = decoded._id; // assuming middleware adds user
    const ourPaymentTransactionId = `${paymentMethod}-${uuidv4()}`;

     //Group items by sellerId
    const itemsBySeller = {};
    items.forEach(item => {
      if (!itemsBySeller[item.sellerId]) {
        itemsBySeller[item.sellerId] = [];
      }
      itemsBySeller[item.sellerId].push(item);
    });

    //Create parent order
    const parentOrder = await OrderParent.create({
      userId,
      orderNumber,
      totalAmount: total,
      paymentMethod,
      paymentStatus: paymentMethod === "cod" ? "not_required" : "pending",
      ourPaymentTransactionId,
      shippingAddress,
      shippingMethod,
      shippingCost,
      status
    });

    const subOrderIds = [];

    //Create sub-orders per seller
    for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
      const subtotalSeller = sellerItems.reduce((sum, i) => sum + i.price * i.qty, 0);

      const subOrder = await Order.create({
        parentOrderId: parentOrder._id,
        customerId:sellerId,
        userId,
        orderNumber: `${uuidv4()}`, // unique per seller
        items: sellerItems,
        subtotal: subtotalSeller,
        total: subtotalSeller,
        paymentMethod,
        paymentStatus: paymentMethod === "cod" ? "not_required" : "pending",
        shippingAddress
      });

      subOrderIds.push(subOrder._id);
    }

    // Update parent order with sub-orders
    parentOrder.subOrders = subOrderIds;
    await parentOrder.save();
    await Cart.findByIdAndDelete(orderNumber);

    // Send confirmation email
    await sendMail(shippingAddress.email, "Order Confirmed", `Your order ${orderNumber} has been placed successfully.`);
    

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      parentOrder,
      subOrders: subOrderIds
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};