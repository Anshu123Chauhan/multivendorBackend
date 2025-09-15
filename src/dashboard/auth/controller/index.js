import User from '../../../models/User.js';
import { signToken } from '../../../middleware/auth.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    res.json({ success: true, token, message: "login successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}