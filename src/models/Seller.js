import mongoose from 'mongoose';

const sellerSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true },

    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },

    fullName: { type: String },
    businessName: { type: String },
    businessAddress: { type: String },

    phone: { type: String },
    identityProof: { type: String },
    panCard: { type: String },
    aadhaar: { type: String },
    altId: { type: String },
    gstNumber: { type: String },

    accountHolder: { type: String },
    ifscCode: { type: String },
    bankAccount: { type: String },
    commission : { type: String },

    addressProof: { type: String },
    image: { type: String },
  },
  { timestamps: true }
);

sellerSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  try {
    const last = await this.constructor.findOne({}, { id: 1 }, { sort: { id: -1 } });
    this.id = last && last.id ? last.id + 1 : 1;
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model('Seller', sellerSchema);
