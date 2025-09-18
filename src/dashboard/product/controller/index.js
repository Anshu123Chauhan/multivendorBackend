import {Product} from "../../../models/Product.js";
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config();

// Create Product with images & variants (each variant may include images array)
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