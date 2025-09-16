import Seller from '../../../models/Seller.js';
import Role from '../../../models/Role.js';
import Permission from '../../../models/Permission.js';
import User from '../../../models/User.js';
import Admin from '../../../models/admin.js';
import bcrypt from 'bcrypt';

export const adminRegister = async (req, res) => {
  try {
    const { username, email, password, fullName, phone } = req.body;

    const existing = await Admin.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ error: 'Username or Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new Admin({
      username,
      email,
      password: hashedPassword,
      fullName,
      phone,
      isActive: true
    });

    await admin.save();

    const adminRole = new Role({
      role_type: 'admin',
      parent_type: 'admin',
      user_id: admin._id,
      system: true
    });
    await adminRole.save();
    res.json({ message: 'Admin created successfully', admin });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
   }
    res.status(500).json({ error: err.message });
  }
};

export const sellerRegister = async (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      businessName,
      businessAddress,
      phone,
      identityProof,
      identityProofNumber,
      gstNumber,
      accountHolder,
      ifscCode,
      bankAccount,
      addressProof
    } = req.body;

    const seller = new Seller({
      email,
      password,
      fullName,
      businessName,
      businessAddress,
      phone,
      identityProof,
      identityProofNumber,
      isActive: true,
      gstNumber,
      accountHolder,
      ifscCode,
      bankAccount,
      addressProof
    });

    await seller.save();

    const sellerRole = new Role({
      role_type: 'seller',
      parent_type: 'admin',
      user_id: seller._id,
      system: false
    });
    await sellerRole.save();
    res.json({success:true, message: 'Seller created successfully', seller });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
   }
    res.status(500).json({success:false, error: err.message });
  }
}
export const sellerListing = async (req, res) => {
  try {
    const sellerList = await Seller.find();
    res.json({ success: true, message: 'Seller get successfully', sellerList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export const userRegister = async (req, res) => {
  try {
    const { name, email, password, role_id, permissions = [] } = req.body;
    const role = await Role.findById(role_id);
    if (!role) return res.status(400).json({ error: 'role not found' });
    const user = new User({ name, email, password, role_id: role._id, parent_id: req.user._id });
    await user.save();
    for (const p of permissions) {
      await Permission.findOneAndUpdate({ role_id: user._id, tab_name: p.tab_name }, { $set: { p_read: !!p.p_read, p_write: !!p.p_write, p_update: !!p.p_update, p_delete: !!p.p_delete } }, { upsert: true });
    }
    res.json({ message: 'Global user created', user });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
   }
    res.status(500).json({ error: err.message });
  }
}

export const assignRoleAndPermission = async (req, res) => {
  try {
    const { role_name, role_type, tab_name, p_read, p_write, p_update, p_delete } = req.body;
    const r = new Role({ role_name, role_type, system: false });
    await r.save();
    const roleId = r._id;
    await Permission.findOneAndUpdate({ role_id: roleId, tab_name }, { $set: { p_read: !!p_read, p_write: !!p_write, p_update: !!p_update, p_delete: !!p_delete } }, { upsert: true });
    res.json({ message: 'Permission assigned to role' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}