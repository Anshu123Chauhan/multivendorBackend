import {Product} from "../../../models/Product.js";
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import {generateSlug} from '../../../utils/slugify.js'
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
    const slug = generateSlug(name);    
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
      usertype,
      slug
    });

    res.status(201).json({sucess:true,product});

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getProducts = async (req, res) => {
  try {
 let { page = 1, limit = 10, search = "", sort = "createdAt", order = "desc" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const sortObj = {};
    sortObj[sort] = order === "asc" ? 1 : -1;

    const products = await Product.aggregate([
      {
        $match: {
          isDeleted: false,
          name: { $regex: search, $options: "i" }
        }
      },

      // Lookup attributes
      {
        $lookup: {
          from: "attributes",
          localField: "variants.attributes.attribute",
          foreignField: "_id",
          as: "attributeDocs"
        }
      },

      // Populate variant attributes
      {
        $addFields: {
          variants: {
            $map: {
              input:{ $ifNull: ["$variants", []] },
              as: "variant",
              in: {
                $mergeObjects: [
                  "$$variant",
                  {
                    attributes: {
                      $map: {
                        input: { $ifNull: ["$$variant.attributes", []] },
                        as: "va",
                        in: {
                          attribute: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$attributeDocs",
                                  cond: { $eq: ["$$this._id", "$$va.attribute"] }
                                }
                              },
                              0
                            ]
                          },
                          value: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: {
                                    $arrayElemAt: [
                                      {
                                        $filter: {
                                          input: "$attributeDocs",
                                          cond: { $eq: ["$$this._id", "$$va.attribute"] }
                                        }
                                      },
                                      0
                                    ]
                                  }.values,
                                  cond: { $eq: ["$$this._id", "$$va.value"] }
                                }
                              },
                              0
                            ]
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },

      // Remove helper docs
      { $unset: "attributeDocs" },

      // Sorting
      { $sort: sortObj },

      // Pagination
      { $skip: skip },
      { $limit: limit }
    ]);

    // Get total count (for frontend pagination UI)
    const total = await Product.countDocuments({
      isDeleted: false,
      name: { $regex: search, $options: "i" }
    });

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      products
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getProduct = async (req, res) => {
  try {
  const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const product = await Product.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id), isDeleted: false } },

      // Lookup attributes
      {
        $lookup: {
          from: "attributes",
          localField: "variants.attributes.attribute",
          foreignField: "_id",
          as: "attributeDocs"
        }
      },

      // Replace variant attributes with populated data
      {
        $addFields: {
          variants: {
            $map: {
              input: "$variants",
              as: "variant",
              in: {
                $mergeObjects: [
                  "$$variant",
                  {
                    attributes: {
                      $map: {
                        input: "$$variant.attributes",
                        as: "va",
                        in: {
                          attribute: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: "$attributeDocs",
                                  cond: { $eq: ["$$this._id", "$$va.attribute"] }
                                }
                              },
                              0
                            ]
                          },
                          value: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: {
                                    $arrayElemAt: [
                                      {
                                        $filter: {
                                          input: "$attributeDocs",
                                          cond: { $eq: ["$$this._id", "$$va.attribute"] }
                                        }
                                      },
                                      0
                                    ]
                                  }.values,
                                  cond: { $eq: ["$$this._id", "$$va.value"] }
                                }
                              },
                              0
                            ]
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },

      // Clean attributeDocs from output
      { $unset: "attributeDocs" }
    ]);

    if (!product || product.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      images,        // optional: new array replaces existing product.images
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
      usertype      // optional: array to replace variants
    } = req.body;

    const product = await Product.findOne({ _id: req.params.id, isDeleted: false });
    const slug = generateSlug(name); 
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (name !== undefined){ product.name = name; product.slug = slug; }
    if (description !== undefined) product.description = description;
    if (images !== undefined) product.images = Array.isArray(images) ? images : product.images;
    if (status !== undefined) product.status = status;
    if (category !== undefined) product.category = category;
    if (subCategory !== undefined) product.subCategory = subCategory;
    if (brand !== undefined) product.brand = brand; 
    if (sellingPrice !== undefined) product.sellingPrice = sellingPrice;
    if (mrp !== undefined) product.mrp = mrp;
    if (sku !== undefined) product.sku = sku;
    if (inventory !== undefined) product.inventory = inventory;
    if (tags !== undefined) product.tags = Array.isArray(tags) ? tags : product.tags;
    if (vendor !== undefined) product.vendor = vendor;
    if (usertype !==undefined) product.usertype = usertype

    if (variants !== undefined) {
      product.variants = Array.isArray(variants) ? variants : product.variants;
    }
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Soft-delete
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    product.isDeleted = true;
    await product.save();
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//Restore Product
export const restoreProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findOne({ _id: id, isDeleted: true });
    if (!product) return res.status(404).json({ message: "Product not found or not deleted" });

    product.isDeleted = false;
    await product.save();

    res.json({ message: "Product restored successfully", product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addVariant = async (req, res) => {
  try {
    const { id } = req.params; // product id
    const { sku, price, mrp, stock, images = [], attributes = {} } = req.body;

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const newVariant = {
      sku,
      price,
      mrp,
      stock,
      images,
      attributes,
    };

    product.variants.push(newVariant);
    await product.save();

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//Update a Variant
export const updateVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    // update only provided fields
    const { sku, price, mrp, stock, images, attributes } = req.body;
    if (sku !== undefined) variant.sku = sku;
    if (price !== undefined) variant.price = price;
    if (mrp !== undefined) variant.mrp = mrp;
    if (stock !== undefined) variant.stock = stock;
    if (images !== undefined) variant.images = images;
    if (attributes !== undefined) variant.attributes = attributes;

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//Soft Delete Variant
export const deleteVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    variant.isDeleted = true; // soft delete flag
    await product.save();

    res.json({ message: "Variant deleted successfully", product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Restore Variant
export const restoreVariant = async (req, res) => {
  try {
    const { id, variantId } = req.params;

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const variant = product.variants.id(variantId);
    if (!variant || variant.isDeleted === false)
      return res.status(404).json({ message: "Variant not found or not deleted" });

    variant.isDeleted = false;
    await product.save();

    res.json({ message: "Variant restored successfully", product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
