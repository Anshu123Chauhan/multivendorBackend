import mongoose from "mongoose";
import slugify from 'slugify'

const attributeValueSchema = new mongoose.Schema({
  value: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
  slug: { type: String, trim: true }, //no unique here
});

const attributeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    values: [attributeValueSchema],
    isActive: { type: Boolean, default: true },
    slug: { type: String, trim: true, unique: true }, //unique only at attribute level
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Generate slug for attribute name
attributeSchema.pre("save", function (next) {
  if (this.name && (!this.slug || this.isModified("name"))) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

attributeValueSchema.pre("save", function (next) {
  if (this.value && (!this.slug || this.isModified("value"))) {
    this.slug = slugify(this.value, { lower: true, strict: true });
  }
  next();
});

export default mongoose.model("Attribute", attributeSchema);
