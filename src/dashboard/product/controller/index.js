import {Product} from "../../../models/Product.js";
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config();

export const createProduct = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    if(!token) return res.status(401).json({sucess:false, meaasge:"You Are Unauthorized to Access this module"}) 
    const vendor = decoded._id
    const usertype = decoded.userType
    const {
      name,
      description,
      images = [], 
      status, 
      category,
      subCategory,
      brand,
      sellingPrice,
      mrp,
      sku,
      inventory,
      tags = [],
      variants = [],    
    } = req.body;

     if (!mongoose.Types.ObjectId.isValid(category) || !mongoose.Types.ObjectId.isValid(subCategory)|| !mongoose.Types.ObjectId.isValid(brand)) {
          return res.status(400).json({ success: false, message: "Invalid ID" });
        }
    const product = await Product.create({
      name,
      description,
      images,
      status,
      category,
      subCategory,
      brand,
      sellingPrice,
      mrp,
      sku,
      inventory,
      tags,
      vendor,
      variants,
      usertype
    });

    res.status(201).json({sucess:true,product});

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getProducts = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", sortBy = "createdAt", order = "desc" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const baseQuery = { isDeleted: false };
    if (search) {
      baseQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { "variants.sku": { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Product.countDocuments(baseQuery);
    const data = await Product.find(baseQuery)
      .sort({ [sortBy]: order === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ total, page, limit, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isDeleted: false });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};