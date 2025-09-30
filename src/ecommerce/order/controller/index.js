// controllers/orderController.js
import { Order } from "../../../models/Order.js";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

export const placeOrder = async (req, res) => {
  try {
    const {
      orderNumber,
      items,
      shippingAddress,
      paymentMethod,
      subtotal,
      shippingMethod,
      shippingCost,
      paymentStatus,
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
    const customerId = decoded._id; // assuming middleware adds user
    const ourPaymentTransactionId = `${paymentMethod}-${uuidv4()}`;

    // Create order
    const order = await Order.create({
      orderNumber,
      customerId,
      items,
      shippingAddress,
      paymentMethod,
      ourPaymentTransactionId,
      subtotal,
      shippingMethod,
      shippingCost,
      paymentStatus,
      total
    });

    // const transporter = nodemailer.createTransport({
    //   service: "gmail",
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASS,
    //   },
    // });

    // await transporter.sendMail({
    //   from: process.env.SMTP_USER,
    //   to: req.user.email,
    //   subject: "Order Confirmation",
    //   text: `Your order #${order._id} has been placed successfully!`,
    // });

    // --- emit socket event ---
    if (req.io) {
      req.io.to(`user:${userId}`).emit("order:placed", order);
    }

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
