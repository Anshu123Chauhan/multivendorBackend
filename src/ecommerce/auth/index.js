import jwt from 'jsonwebtoken';
import Customer from '../../models/customer.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: 'No token' });
    const customer = jwt.verify(token, process.env.JWT_SECRET);
    const email = customer.email;
    const data = await Customer.findOne({ email });
    if (!data) return res.status(401).json({ error: 'Customer not found' });
    req.user = data;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const signToken = (customer) => {
  return jwt.sign( customer, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

