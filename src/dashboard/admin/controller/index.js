import Seller from '../../../models/Seller.js';
import Role from '../../../models/Role.js';
import Permission from '../../../models/Permission.js';
import User from '../../../models/User.js';
import Admin from '../../../models/admin.js';
import bcrypt from 'bcrypt';

export const adminRegister = async (req, res) => {
  try {
    const { username, email, password, fullName, phone, isActive } = req.body;

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
      isActive
    });

    await admin.save();

    const adminRole = new Role({
      role_name: 'admin',
      admin_id: admin._id,
      system: true
    });
    await adminRole.save();
    const adminUser = new User({
      username,
      email,
      password,
      phone,
      isActive: true,
      role_id: adminRole._id
  });
  await adminUser.save();
    res.json({ message: 'Admin created successfully', admin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const sellerRegister = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      fullName,
      businessName,
      businessAddress,
      phone,
      identityProof,
      panCard,
      aadhaar,
      altId,
      gstNumber,
      accountHolder,
      ifscCode,
      bankAccount,
      addressProof,
      image
    } = req.body;

    const seller = new Seller({
      username,
      email,
      password,
      fullName,
      businessName,
      businessAddress,
      phone,
      identityProof,
      panCard,
      aadhaar,
      altId,
      gstNumber,
      accountHolder,
      ifscCode,
      bankAccount,
      addressProof,
      image
    });

    await seller.save();

    const sellerRole = new Role({
      role_name: 'seller',
      seller_id: seller._id,
      system: true
    });
    await sellerRole.save();

    res.json({ message: 'Seller created successfully', seller });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
}

export const assignRole = async (req, res) => {
  try {
    const { role_name } = req.body;
    const r = new Role({ role_name, system: false });
    await r.save();
    res.json({ role: r });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const assignPermission = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { tab_name, p_read, p_write, p_update, p_delete } = req.body;
    await Permission.findOneAndUpdate({ role_id: roleId, tab_name }, { $set: { p_read: !!p_read, p_write: !!p_write, p_update: !!p_update, p_delete: !!p_delete } }, { upsert: true });
    res.json({ message: 'Permission assigned to role' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}