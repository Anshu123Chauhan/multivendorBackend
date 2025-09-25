import Admin from '../../../models/admin.js';
import { signToken } from '../../../middleware/auth.js';
import Seller from '../../../models/Seller.js';
import User from '../../../models/User.js';
import Permission from '../../../models/Permission.js';
import Role from '../../../models/Role.js';
import mongoose from 'mongoose';

export const login = async (req, res) => {
  try {
    const { email, password, loginType } = req.body;
    const payload = { email, isActive: true, isDeleted: false };
    let user;
    if(loginType == 'Admin'){
      user = await Admin.findOne(payload);
    } else if(loginType == 'Seller'){
      user = await Seller.findOne(payload);
    } else if(loginType == 'User'){
      user = await User.findOne(payload);
    } else {
      res.status(400).json({ success: false, error: "invalid loginType" });
    }

    if (!user) return res.status(400).json({ error: 'Your account status is either pending or deleted. Please contact the administrator' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    user = user.toObject();
    delete user.password;
    user.userType = loginType;
    if(loginType == 'User'){
      const role = await Role.findById(user.role_id).select("-__v");
      const permission = await Permission.find({role_id: new mongoose.Types.ObjectId(role._id)}).select("-__v");
      user.permission = permission;
    }
    const token = signToken(user);    
    res.json({ success: true, token, message: "login successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}