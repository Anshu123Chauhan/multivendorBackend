import mongoose from 'mongoose';

const sellerCategorySchema = new mongoose.Schema({
  sellerCategoryName: { 
    type: String, 
    required: true,
    unique: true
 },
}, { timestamps: true });

export default mongoose.model('SellerCategory', sellerCategorySchema);


