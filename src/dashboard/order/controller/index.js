import { Order } from "../../../models/Order.js";
import jwt from "jsonwebtoken";

export const getOrders = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      order = "desc",
    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!token)
      return res.status(401).json({
        sucess: false,
        meaasge: "You Are Unauthorized to Access this module",
      });
    const vendor = decoded._id;
    const usertype = decoded.userType;

    const baseQuery = { isDeleted: false };
    // If seller → restrict by vendor
    if (usertype === "Seller") {
      baseQuery.vendor = vendor;
    }
    if (usertype === "User") {
      // staff should see their seller's products
      baseQuery.vendor = decoded.parent_id;
      // baseQuery.vendor = decoded._id; // staff belongs to seller
    }
     if (search) {
          baseQuery.$or = [
            { name: { $regex: search, $options: "i" } },
            { "variants.sku": { $regex: search, $options: "i" } },
            { sku: { $regex: search, $options: "i" } },
          ];
        }
    
        const total = await Order.countDocuments(baseQuery);
        const data = await Order.find(baseQuery)
          .sort({ [sortBy]: order === "desc" ? -1 : 1 })
          .skip((page - 1) * limit)
          .limit(limit);
    
        res.json({ total, page, limit, data });
  } catch (err) {
    res.status(400).JSON({
      message: "somthing went wrong to fetch order data",
      error:err.message
    });
  }
};
