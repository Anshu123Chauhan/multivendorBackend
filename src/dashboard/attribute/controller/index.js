// controllers/attribute.controller.js
import Attribute from "../../../models/Attribute.js";
import {generateSlug} from '../../../utils/slugify.js'
import mongoose from 'mongoose'


//Create Attribute
export const createAttribute = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const slug = generateSlug(name);
    const attribute = await Attribute.create({ name, slug });

    res.status(201).json({ message: "Attribute created", attribute });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Get All Attributes (with Pagination, Search, Sorting)
export const getAttributes = async (req, res) => {
  try {
  const page = Math.max(1, parseInt(req.query.page || 1));
    const limit = Math.min(100, parseInt(req.query.limit || 20));
    const skip = (page - 1) * limit;

    const q = {};
    if (req.query.q) q.name = { $regex: req.query.q, $options: 'i' };
    if (typeof req.query.isActive !== 'undefined') q.isActive = req.query.isActive === 'true';

    // includeDeleted explicit override
    if (req.query.includeDeleted === 'true') {
      q.isDeleted = { $in: [true, false] };
    }

    const [data, total] = await Promise.all([
      Attribute.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Attribute.countDocuments(q.isDeleted ? { ...q } : q)
    ]);

    res.json({ success: true, data, meta: { total, page, limit } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Get Single Attribute
export const getAttributeById = async (req, res) => {
  try {
    const { id } = req.params;
       if (!mongoose.Types.ObjectId.isValid(id)) {
         return res.status(400).json({ success: false, message: "Invalid Attribute ID" });
       }
   
       const attribute = await Attribute.findOne({ _id: id, isDeleted: false })
   
       if (!attribute) {
         return res.status(404).json({ success: false, message: "Attribute not found" });
       }
   
       res.json({ success: true, data: attribute });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Update Attribute
export const updateAttribute = async (req, res) => {
  try {
    const { name } = req.body;
    const attribute = await Attribute.findOne({_id:req.params.id});

    if (!attribute || attribute.isDeleted)
      return res.status(404).json({ message: "Attribute not found" });

    if (name) {
      attribute.name = name;
      attribute.slug = generateSlug(name);
    }

    await attribute.save();
    res.json({ message: "Attribute updated", attribute });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Soft Delete Attribute
export const deleteAttribute = async (req, res) => {
  try {
    const attribute = await Attribute.findOne({_id:req.params.id});

    if (!attribute || attribute.isDeleted)
      return res.status(404).json({ message: "Attribute not found" });

    attribute.isDeleted = true;
    await attribute.save();

    res.json({ message: "Attribute deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const restoreAttribute = async(req,res, next)=>{
 try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Attribute ID" });
    }

    const attribute = await Attribute.findOne({ _id: id, isDeleted: true });

    if (!attribute) {
      return res.status(404).json({ success: false, message: "Attribute not found or already active" });
    }

    attribute.isDeleted = false;
    attribute.deletedAt = null;
    await attribute.save();

    res.json({ success: true, message: "Attribute restored", data: attribute });
  } catch (err) {
    next(err);
  }
}


