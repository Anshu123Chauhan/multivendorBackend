import { Order } from "../../../models/Order.js";
import jwt from "jsonwebtoken";

export const getOrders = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!token)
      return res.status(401).json({
        sucess: false,
        meaasge: "You Are Unauthorized to Access this module",
      });

    const usertype = decoded.userType;
    let query = {};

    //Role-based filtering
    if (usertype === "Seller") {
      query.sellerId = decoded._id;
    } else if (usertype === "Staff") {
      query.sellerId = decoded._id; // staff belongs to seller
    }
    // Admin sees all orders

    // Pagination, Sorting, Searching
    let {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    //Search in product name, orderNumber, or user email
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "items.name": { $regex: search, $options: "i" } },
        { "userId.name": { $regex: search, $options: "i" } },
      ];
    }

    // Count total
    const total = await Order.countDocuments(query);

    //Fetch paginated data
    const orders = await Order.find(query)
      .populate("userId", "name email")
      .populate("customerId", "storeName email")
      .populate("items.productId", "name image price")
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    //Pagination metadata
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages,
      limit,
      count: orders.length,
      orders,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
