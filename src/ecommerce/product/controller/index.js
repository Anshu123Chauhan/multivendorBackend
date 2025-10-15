import Brand from '../../../models/Brand.js';
import {Category,Subcategory} from '../../../models/Category.js';
import {Product} from '../../../models/Product.js';
import Seller from '../../../models/Seller.js';

export const productsListing = async (req, res) => {
  try {
    let { slug, minPrice, maxPrice, page = 1, limit = 10 } = req.query;
    let { brand, category, subcategory, attributes } = req.body;

    page = parseInt(page);
    limit = parseInt(limit);

    // Handle slug -> category
    if (slug) {
      const categoryDoc = await Category.findOne({ slug, isDeleted: false, isActive: true }).lean();
      if (!categoryDoc) {
        return res.status(404).json({ success: false, message: "Category not found for provided slug" });
      }
      category = categoryDoc._id.toString();
    }

    const filter = { isDeleted: false, status: "active" };
    if (brand) filter.brand = brand;
    if (category) filter.category = category;
    if (subcategory) filter.subCategory = subcategory;

    if (minPrice || maxPrice) {
      filter["variants.price"] = {};
      if (minPrice) filter["variants.price"].$gte = Number(minPrice);
      if (maxPrice) filter["variants.price"].$lte = Number(maxPrice);
    }

    if (attributes && Array.isArray(attributes) && attributes.length > 0) {
      filter["$and"] = attributes.map(attr => ({
        "variants.attributes": { $elemMatch: { type: attr.type, value: attr.value } }
      }));
    }

    const skip = (page - 1) * limit;

    let products = await Product.find(filter).skip(skip).limit(limit).lean();

    products = await Promise.all(
      products.map(async (p) => {
        let seller = null;
        if (p.vendor) {
          seller = await Seller.findById(p.vendor).select("fullName").lean();
        }

        let price = { min: p.sellingPrice, max: p.sellingPrice };
        if (p.variants && p.variants.length > 0) {
          const prices = p.variants.map(v => v.price);
          price = { min: Math.min(...prices), max: Math.max(...prices) };
        }

        return {
          ...p,
          price,
          sellerName: seller ? seller.fullName : 'Admin',
        };
      })
    );

    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      products,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in productsListing:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const productDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).lean()
      .populate("brand category subCategory vendor");
    if (!product || product.isDeleted) {
      return res.status(404).json({ error: "Product not found" });
    }
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: id },
      isDeleted: false
    }).limit(6);

    res.json({
      ...product,
      relatedProducts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const categoryListing = async (req, res) => {
  try {
    const data = await Category.find(); 
    res.json({ success: true, data });
  } catch (err) {
    console.error('Error:', err); 
    res.status(500).json({ error: err.message });
  }
};




