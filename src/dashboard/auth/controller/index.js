import Admin from '../../../models/admin.js';
import { signToken } from '../../../middleware/auth.js';
import Seller from '../../../models/Seller.js';
import User from '../../../models/User.js';

export const login = async (req, res) => {
  try {
    const { email, password, loginType } = req.body;
    let user;
    if(loginType == 'Admin'){
      user = await Admin.findOne({ email });
    } else if(loginType == 'Seller'){
      user = await Seller.findOne({ email });
    } else if(loginType == 'User'){
      user = await User.findOne({ email });
    } else {
      res.status(400).json({ success: false, error: "invalid loginType" });
    }

    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    user = user.toObject();
    delete user.password;
    user.userType = loginType;
    const token = signToken(user);    
    res.json({ success: true, token, message: "login successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}