import mongoose from "mongoose";

const attributeValueSchema = new mongoose.Schema({
  value: { type: String, required: true }, // e.g. "Red", "XL"
  isDeleted: { type: Boolean, default: false },
  slug: { type: String, trim: true, index: true, unique: true },
});

const attributeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // e.g. "Color"
    values: [attributeValueSchema],
    isActive: { type: Boolean, default: true },       // Active / Inactive
    slug: { type: String, trim: true, index: true, unique: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Attribute", attributeSchema);
