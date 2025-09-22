import express from 'express'
import Brand from '../../models/Brand.js';
import {Category,Subcategory} from '../../models/Category.js';
import {Product} from '../../models/Product.js';
import Attribute from '../../models/Attribute.js';

export const productFetch =  async (req, res) => {
  try {
    const { brand, category, subcategory, attributes, minPrice, maxPrice, page = 1, limit = 10 } = req.query;

    const filter = { isDeleted: false };

    if (brand) filter.brand = brand;
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (minPrice || maxPrice) filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);

    if (attributes) {
      // attributes = "color:Red,size:XL"
      const attrs = attributes.split(',').map(a => a.split(':'));
      filter.attributes = { $all: attrs.map(([key, value]) => ({ $elemMatch: { key, value } })) };
    }

    const skip = (page - 1) * limit;
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('brand category subcategory')
      .skip(skip)
      .limit(Number(limit));

    res.json({
      products,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const productFilter = async (req, res) => {
  try {
    const brands = await Brand.find({ isDeleted: false });
    const categories = await Category.find({ isDeleted: false });
    const subcategories = await Subcategory.find({ isDeleted: false });
    const attributes = await Product.aggregate([
      { $unwind: '$attributes' },
      { $group: { _id: '$attributes.key', values: { $addToSet: '$attributes.value' } } }
    ]);

    res.json({ brands, categories, subcategories, attributes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
