// controllers/orderController.js
import { Order } from "../../../models/Order.js";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import {sendMail} from '../../../middleware/sendMail.js'
import { Cart } from "../../../models/cart.js";
import Customer from "../../../models/customer.js";

export const placeOrder = async (req, res) => {
  try {
    const {
      orderNumber,
      items = [],
      shippingAddress,
      paymentMethod = "cod",
      shippingMethod = "standard",
      shippingCost = 0,
      status = "placed",
    } = req.body;
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token is missing",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items provided to place an order",
      });
    }

    const normalisedItems = [];
    for (const rawItem of items) {
      if (!rawItem?.sellerId) {
        return res.status(400).json({
          success: false,
          message: "Each item must include a sellerId",
        });
      }
      const qty = Number(rawItem.qty ?? rawItem.quantity ?? 1);
      const price = Number(rawItem.price ?? 0);
      normalisedItems.push({
        ...rawItem,
        sellerId: rawItem.sellerId,
        qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
        price: Number.isFinite(price) ? price : 0,
      });
    }

    // Group items by sellerId
    const itemsBySeller = normalisedItems.reduce((acc, item) => {
      const key = item.sellerId.toString();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});

    const sellerEntries = Object.entries(itemsBySeller);

    if (sellerEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Unable to group items by seller",
      });
    }

    const allowedStatuses = ["placed", "paid", "shipped", "delivered", "cancelled"];
    const orderStatus = allowedStatuses.includes(status) ? status : "placed";

    const baseOrderNumber = orderNumber || uuidv4();
    const baseTransactionId = `${paymentMethod || "cod"}-${uuidv4()}`;

    const totalShippingCost = Number(shippingCost || 0);
    const sellerCount = sellerEntries.length;
    const shippingCentsTotal = Math.round(totalShippingCost * 100);
    const baseShareCents = sellerCount > 0 ? Math.floor(shippingCentsTotal / sellerCount) : 0;
    let remainderCents = sellerCount > 0 ? shippingCentsTotal % sellerCount : 0;

    const createdOrders = [];

    for (let index = 0; index < sellerEntries.length; index += 1) {
      const [sellerId, sellerItems] = sellerEntries[index];
      let shareCents = baseShareCents;
      if (remainderCents > 0) {
        shareCents += 1;
        remainderCents -= 1;
      }
      const shippingShare = shareCents / 100;

      const subtotal = sellerItems.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
        0
      );

      const orderTracking = {};
      orderTracking[orderStatus] = new Date();

      const createdOrder = await Order.create({
        orderNumber: sellerEntries.length === 1 ? baseOrderNumber : `${baseOrderNumber}-${index + 1}`,
        customerId: sellerId,
        userId,
        items: sellerItems,
        subtotal,
        shippingMethod,
        shippingCost: shippingShare,
        shippingAddress,
        paymentMethod,
        paymentStatus: paymentMethod === "cod" ? "not_required" : "pending",
        ourPaymentTransactionId: `${baseTransactionId}-${index + 1}`,
        total: subtotal + shippingShare,
        status: orderStatus,
        orderTracking,
      });

      createdOrders.push(createdOrder.toObject());
    }

    if (orderNumber) {
      await Cart.findByIdAndDelete(orderNumber).catch(() => null);
    }

    const customer = await Customer.findById(userId);
    const orderDate = new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Build product table dynamically
    const productRows = normalisedItems
      .map(
        (p) => `
        <tr>
          <td>${p.name ?? ""}</td>
          <td>${p.qty}</td>
          <td>₹${Number(p.price || 0).toFixed(2)}</td>
        </tr>`
      )
      .join("");

    const orderNumbersText = createdOrders.map((order) => order.orderNumber).join(", ");
    const grandSubtotal = createdOrders.reduce((sum, order) => sum + Number(order.subtotal || 0), 0);
    const grandShipping = createdOrders.reduce((sum, order) => sum + Number(order.shippingCost || 0), 0);
    const grandTotal = createdOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

    const shippingAddressHtml = shippingAddress
      ? [
          shippingAddress.recipientName,
          shippingAddress.street,
          [shippingAddress.city, shippingAddress.state].filter(Boolean).join(", "),
          shippingAddress.pincode,
          shippingAddress.phone,
        ]
          .filter(Boolean)
          .join("<br>")
      : "Shipping address not available";

    const primaryOrderNumber = createdOrders[0]?.orderNumber;
    const trackingLink = primaryOrderNumber
      ? `http://localhost:3000/orders/${primaryOrderNumber}`
      : `http://localhost:3000/orders`;

    // Send confirmation email
    if (customer?.email) {
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
          <p>Hi ${customer.name ?? "there"},</p>
          <p>Thank you for shopping with us! Your order${createdOrders.length > 1 ? "s" : ""} <strong>#${orderNumbersText}</strong> ${createdOrders.length > 1 ? "have" : "has"} been successfully placed on <strong>${orderDate}</strong>.</p>
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
            <p class="total">Grand Total: ₹${grandTotal.toFixed(2)}</p>
          </div>

          <p><strong>Shipping Address:</strong><br>
            ${shippingAddressHtml}
          </p>

          <a href="${trackingLink}" class="btn" style="color: white; text-decoration: none;">Track Your Order</a>

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
    }

    res.status(201).json({
      success: true,
      message: "Orders placed successfully",
      orders: createdOrders,
    });
    
  } catch (err) {
    console.error("Error placing order:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getCustomerOrders = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        sucess: false,
        meaasge: "Token is Missing",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id;

    //Query params
    let {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      order = "desc"
    } = req.query;

    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
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
    const total = await Order.countDocuments(query);

    //Fetch data
    const orders = await Order.find(query)
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

export const customerOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "You are unauthorized to access this module",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id;

    const order = await Order.findOne({ _id: id, userId })
      .populate("items.productId", "name images price description")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
