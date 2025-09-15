import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, sparse: true },

    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },

    fullName: { type: String },
    phone: { type: String },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
    system: { type: Boolean, default: true }
  },
  { timestamps: true }
);

adminSchema.pre('save', async function (next) {
  if (!this.isNew) return next();
  try {
    const last = await this.constructor.findOne({}, { id: 1 }, { sort: { id: -1 } });
    this.id = last && last.id ? last.id + 1 : 1;
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model('Admin', adminSchema);
