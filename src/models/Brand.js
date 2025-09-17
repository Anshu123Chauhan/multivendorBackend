// models/Brand.js
import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Brand name is required"],
      trim: true,
      unique: true
    },
    description: {
      type: String,
      default: ""
    },
    image: {
      type: String, // store URL or file path
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true } // automatically adds createdAt & updatedAt
);

export default mongoose.model("Brand", brandSchema);
