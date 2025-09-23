import { signToken } from '../../../middleware/auth.js';
import Customer from '../../../models/customer.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    let customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(400).json({ error: 'Email not registered with us' });
    }
    const ok = await customer.comparePassword(password);
    if (!ok) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const customerData = customer.toObject();
    delete customerData.password;
    delete customerData.__v;
    const token = signToken(customerData);
    res.json({ success: true, token, message: "Login successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const customerRegister =  async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    const existingCustomer = await Customer.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingCustomer) {
      return res
        .status(400)
        .json({ success: false, message: "Customer with this email or phone already exists" });
    }

    const customer = new Customer({
      name,
      email,
      phone,
      password,
    });

    await customer.save();

    res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      data: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error) {
    console.error("Error in register API:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const customerPasswordUpdate = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required" });
    }

    customer.password = password; 
    await customer.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error in password update API:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};