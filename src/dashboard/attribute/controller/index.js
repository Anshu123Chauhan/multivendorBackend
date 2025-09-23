import slugify from 'slugify'
import Attribute from "../../../models/Attribute.js";
import {generateSlug} from '../../../utils/slugify.js'
import mongoose from 'mongoose'


//Create Attribute
export const createAttribute = async (req, res) => {
  try {
    const { name, values=[] } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

      const slug = generateSlug(name);
    const attribute = new Attribute({ name, slug, values});
    await attribute.save();
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
    const { name, values } = req.body;
    const attribute = await Attribute.findOne({ _id: req.params.id });

    if (!attribute || attribute.isDeleted) {
      return res.status(404).json({ message: "Attribute not found" });
    }

    // Update attribute name + slug
    if (name) {
      attribute.name = name;
      attribute.slug = slugify(name, { lower: true, strict: true });
    }

    // Update values if provided
    if (Array.isArray(values)) {
      values.forEach((val) => {
        if (val._id) {
          // Existing value → update
          const existingValue = attribute.values.id(val._id);
          if (existingValue) {
            if (val.value) {
              existingValue.value = val.value;
              existingValue.slug = slugify(val.value, { lower: true, strict: true });
            }
            if (typeof val.isDeleted === "boolean") {
              existingValue.isDeleted = val.isDeleted;
            }
          }
        } else {
          // New value → push
          attribute.values.push({
            value: val.value,
            slug: slugify(val.value, { lower: true, strict: true }),
            isDeleted: val.isDeleted ?? false
          });
        }
      });
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

// export const bulkCreateAttributes = async (req, res) => {
//   try {
//     let { attributes } = req.body;

//     if (!Array.isArray(attributes)) {
//       return res.status(400).json({ message: "attributes must be an array" });
//     }

//     // Normalize attributes and generate slugs
//     attributes = attributes.map(attr => {
//       const attrSlug = slugify(attr.name, { lower: true, strict: true });
//       return {
//         ...attr,
//         slug: attrSlug,
//         values: (attr.values || []).map(v => {
//           const val = typeof v === "string" ? v : v.value;
//           return {
//             value: val,
//             slug: slugify(val, { lower: true, strict: true }),
//             isDeleted: false,
//           };
//         }),
//         isActive: attr.isActive ?? true,
//         isDeleted: attr.isDeleted ?? false,
//       };
//     });

//     // Request-level duplicate check
//     const seenAttrSlugs = new Set();
//     for (const attr of attributes) {
//       if (seenAttrSlugs.has(attr.slug)) {
//         return res.status(400).json({ message: `Duplicate attribute in request: ${attr.name}` });
//       }
//       seenAttrSlugs.add(attr.slug);

//       const seenValueSlugs = new Set();
//       for (const v of attr.values) {
//         if (seenValueSlugs.has(v.slug)) {
//           return res.status(400).json({ message: `Duplicate value "${v.value}" in attribute "${attr.name}"` });
//         }
//         seenValueSlugs.add(v.slug);
//       }
//     }

//     //Use save() instead of insertMany so hooks & unique errors are handled cleanly
//     const inserted = [];
//     for (const attr of attributes) {
//       try {
//         const doc = new Attribute(attr);
//         const saved = await doc.save();
//         inserted.push(saved);
//       } catch (err) {
//         if (err.code === 11000) {
//           console.warn(`Skipped duplicate attribute: ${attr.name}`);
//           continue;
//         }
//         throw err;
//       }
//     }

//     res.status(201).json({
//       message: "Bulk attributes processed",
//       data: inserted,
//     });
//   } catch (error) {
//     console.error("Bulk create error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

export const bulkUpsertAttributes = async (req, res) => {
  try {
    let { attributes } = req.body;

    if (!Array.isArray(attributes)) {
      return res.status(400).json({ message: "attributes must be an array" });
    }

    // Normalize attributes and generate slugs
    attributes = attributes.map(attr => {
      const attrSlug = slugify(attr.name, { lower: true, strict: true });

      // filter duplicate values inside same request
      const seenValueSlugs = new Set();
      const cleanedValues = [];

      for (const v of attr.values || []) {
        const val = typeof v === "string" ? v : v.value;
        const valSlug = slugify(val, { lower: true, strict: true });

        if (!seenValueSlugs.has(valSlug)) {
          seenValueSlugs.add(valSlug);
          cleanedValues.push({
            value: val,
            slug: valSlug,
            isDeleted: false,
          });
        }
      }

      return {
        ...attr,
        slug: attrSlug,
        values: cleanedValues,
        isActive: attr.isActive ?? true,
        isDeleted: attr.isDeleted ?? false,
      };
    });

    const results = [];

    for (const attr of attributes) {
      let existing = await Attribute.findOne({ slug: attr.slug });

      if (existing) {
        const existingValueSlugs = new Set(
          existing.values.map(v => slugify(v.value, { lower: true, strict: true }))
        );

        for (const v of attr.values) {
          if (!existingValueSlugs.has(v.slug)) {
            existing.values.push(v);
          }
        }

        existing.isActive = attr.isActive;
        existing.isDeleted = attr.isDeleted;

        await existing.save();
        results.push({ action: "updated", attribute: existing });
      } else {
        const created = await Attribute.create(attr);
        results.push({ action: "created", attribute: created });
      }
    }

    res.status(200).json({
      message: "Bulk upsert processed successfully",
      data: results,
    });
  } catch (error) {
    console.error("Bulk upsert error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteAttributeValue = async (req, res) => {
  try {
    const { attributeId, valueId } = req.params;

    // Find the attribute
    const attribute = await Attribute.findById(attributeId);
    if (!attribute) {
      return res.status(404).json({ message: "Attribute not found" });
    }

    // Find value inside the attribute
    const value = attribute.values.id(valueId);
    if (!value) {
      return res.status(404).json({ message: "Attribute value not found" });
    }

    // Soft delete (recommended)
    value.isDeleted = true;

    // OR hard delete (permanently remove)
    // attribute.values.id(valueId).remove();

    await attribute.save();

    res.status(200).json({
      message: "Attribute value deleted successfully",
      attribute,
    });
  } catch (error) {
    console.error("Delete attribute value error:", error);
    res.status(500).json({ message: error.message });
  }
};
