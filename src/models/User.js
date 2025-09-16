import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  store: { type: String },
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  password: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  seller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', default: null },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  approve_status: Number
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);

