import Seller from '../../../models/Seller.js';

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
      gstNumber,
      accountHolder,
      ifscCode,
      bankAccount,
      addressProof
    });

    await seller.save();

    res.json({ success: true, message: 'Seller created successfully', seller });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
   }
    res.status(500).json({success:false, error: err.message });
  }
}
export const getSeller = async (req, res) => {
  try {
    const { id } = req.params;
    const seller = await Seller.findById(id);
    res.json({ success: true, message: 'Seller created successfully', seller });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
   }
    res.status(500).json({success:false, error: err.message });
  }
}
export const updateSeller = async (req, res) => {
  try {
    const {
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
    const { id } = req.params;

    const seller = await Seller.findByIdAndUpdate( id,{
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
    });

    res.json({ success: true, message: 'Seller updated successfully', seller });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
   }
    res.status(500).json({success:false, error: err.message });
  }
}
export const deleteSeller = async (req, res) => {
  try {
    const { id } = req.params;
    const seller = await Seller.findByIdAndUpdate( id ,{
      isActive: false,
      isDeleted: true
    });
    res.json({ success: true, message: 'Seller fetch successfully', seller });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
   }
    res.status(500).json({success:false, error: err.message });
  }
}