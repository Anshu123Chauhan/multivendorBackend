// controllers/orderController.js
import { Order,OrderParent } from "../../../models/Order.js";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import {sendMail} from '../../../middleware/sendMail.js'
import { Cart } from "../../../models/cart.js";
import Customer from "../../../models/customer.js";

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

    const customer = await Customer.findById(userId);
    const orderDate = new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

     // Build product table dynamically
    const productRows = items
      .map(
        (p) => `
        <tr>
          <td>${p.name}</td>
          <td>${p.qty}</td>
          <td>₹${p.price}</td>
        </tr>`
      )
      .join("");

    // Send confirmation email
  const orderTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Order Confirmation</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #f9f9f9;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 650px;
          margin: 30px auto;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        .header {
          background: #007bff;
          color: white;
          text-align: center;
          padding: 25px;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
        }
        .content {
          padding: 25px;
          color: #333;
        }
        .content p {
          font-size: 16px;
          margin-bottom: 10px;
        }
        .order-details {
          margin-top: 20px;
          border-top: 1px solid #eee;
          padding-top: 15px;
        }
        .order-details table {
          width: 100%;
          border-collapse: collapse;
        }
        .order-details th, .order-details td {
          text-align: left;
          padding: 8px 5px;
          border-bottom: 1px solid #eee;
          font-size: 15px;
        }
        .total {
          text-align: right;
          font-size: 17px;
          font-weight: bold;
          margin-top: 10px;
        }
        .footer {
          background: #f1f1f1;
          text-align: center;
          padding: 15px;
          font-size: 14px;
          color: #777;
        }
        .btn {
          display: inline-block;
          background: #007bff;
          color: white;
          padding: 10px 18px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: 600;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmed! 🎉</h1>
        </div>
        <div class="content">
          <p>Hi ${customer.name},</p>
          <p>Thank you for shopping with us! Your order <strong>#${orderNumber}</strong> has been successfully placed on <strong>${orderDate}</strong>.</p>
          <p>We’ll notify you once your order is shipped.</p>

          <div class="order-details">
            <h3>Order Details:</h3>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${productRows}
              </tbody>
            </table>
            <p class="total">Total: ₹${total}</p>
          </div>

          <p><strong>Shipping Address:</strong><br>
            ${shippingAddress.recipientName}<br>
            ${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}<br>
            ${shippingAddress.phone}
          </p>

          <a href="http://localhost:3000/orders/${orderNumber}" class="btn" style="color: white; text-decoration: none;">Track Your Order</a>

          <p>If you have any questions, feel free to contact us at 
          <a href="mailto:support@ens.enterprises">support@ens.enterprises</a>.</p>
          <p>We hope you enjoy your purchase!</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ENS ENTERPRISES Ltd. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>`;
  await sendMail(
  orderTemplate,
  "Order Confirmation - Your order has been placed successfully",
  customer.email
);

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

export const getCustomerOrders = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!token)
      return res.status(401).json({
        sucess: false,
        meaasge: "Token is Missing",
      });
    const userId = decoded._id; // assuming middleware adds user

    //Query params
    let {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      order = "desc"
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    //Base query (only customer’s orders)
    const query = { userId };

    //Searching
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { paymentMethod: { $regex: search, $options: "i" } },
        { paymentStatus: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } }
      ];
    }

    //Count total
    const total = await OrderParent.countDocuments(query);

    //Fetch data
   const orders = await Order.find(query)
      .populate("parentOrderId", "")
      .populate("items.productId", "name image price")
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    //Pagination metadata
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      total,
      totalPages,
      page,
      limit,
      count: orders.length,
      orders
    });
  } catch (err) {
    console.error("Error fetching customer orders:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};