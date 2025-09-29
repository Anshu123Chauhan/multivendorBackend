// controllers/orderController.js
import {Order} from "../../../models/Order.js";
import nodemailer from "nodemailer";

export const placeOrder = async (req, res) => {
  try {
    const { items, address, paymentMethod } = req.body;
    const customerId = req.user._id; // assuming middleware adds user

    // Create order
    const order = await Order.create({
      customerId,
      items,
      address,
      paymentMethod,
      status: "confirmed"
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: req.user.email,
      subject: "Order Confirmation",
      text: `Your order #${order._id} has been placed successfully!`,
    });

    // --- emit socket event ---
    if (req.io) {
      req.io.to(`user:${userId}`).emit("order:placed", order);
    }

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
