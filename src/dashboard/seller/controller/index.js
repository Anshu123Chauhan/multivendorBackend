import User from '../../../models/User.js';
import Role from '../../../models/Role.js';
import Permission from '../../../models/Permission.js';
import Seller from '../../../models/Seller.js';

export const sellerUserRegister = async (req, res) => {
  try {
     const seller = req.user;

    if (seller.userType !== 'seller' && roleDoc.userType !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only sellers/admin can create seller users' });
    }

    const { username, phone, email, password, role_id } = req.body;
    if(!role_id) return res.status(400).json({ success: false, error: 'role_id is required' });
    const role = role_id && await Role.findById(role_id);

    if (!role) {
      return res.status(400).json({ success: false, error: 'Role not found' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      phone,
      password: hashedPassword,
      role_id: role._id,
      parent_type: seller.userType,
      parent_id: seller._id
    });

    await user.save();

    res.json({ success: true, message: 'Seller user created successfully', user });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
   }
    res.status(500).json({ success: false, error: err.message });
  }
}

export const sellerUserPermission = async (req, res) => {
  try {
    let user = req.user;
    const { role_name, role_type = 'User', parent_type = 'Seller', permissions=[] } = req.body;
    const r = new Role({ user_id: user._id, role_name, role_type, parent_type, system: false });
    await r.save();
    const roleId = r._id;
    for (const p of permissions) {
          await Permission.findOneAndUpdate(
            {  role_id: roleId, tab_name: p.tab_name }, 
            {
              $set: {
                p_read: !!p.p_read,
                p_write: !!p.p_write,
                p_update: !!p.p_update,
                p_delete: !!p.p_delete
              }
            },
            { upsert: true }
          );
        }
    res.json({ success:true, message: 'Permission assigned to role By seller' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

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

export const sellerUserGet = async (req,res) => {
   try {
     const seller = req.user;
    const roleDoc = await Role.findById(seller.role_id);

    if (!roleDoc) {
      return res.status(500).json({ success: false, error: 'Role not found for seller' });
    }

    if (roleDoc.role_type !== 'seller' && roleDoc.role_type !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only sellers/admin can create seller users' });
    }
    const {id} = req.params;
    const user = await User.findById(id);

    res.json({ success: true, message: 'Seller user update successfully', user });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
   }
    res.status(500).json({ success: false, error: err.message });
  }
}
export const sellerUserUpdate = async (req,res) => {
   try {
     const seller = req.user;
    const roleDoc = await Role.findById(seller.role_id);

    if (!roleDoc) {
      return res.status(500).json({ success: false, error: 'Role not found for seller' });
    }

    if (roleDoc.role_type !== 'seller' && roleDoc.role_type !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only sellers/admin can create seller users' });
    }

    const { username, email, password, role_id, permissions = [] } = req.body;
    if(!role_id) return res.status(400).json({ success: false, error: 'role_id is required' });
    const role = role_id && await Role.findById(role_id);

    if (!role) {
      return res.status(400).json({ success: false, error: 'Role not found' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.findByIdAndUpdate( id, {
      username,
      email,
      password: hashedPassword,
      role_id: role._id,
      parent_id: seller._id, 
      seller_id: seller._id  
    });

    for (const p of permissions) {
      await Permission.findOneAndUpdate(
        { user_id: user._id, tab_name: p.tab_name }, 
        {
          $set: {
            p_read: !!p.p_read,
            p_write: !!p.p_write,
            p_update: !!p.p_update,
            p_delete: !!p.p_delete
          }
        },
        { upsert: true }
      );
    }

    res.json({ success: true, message: 'Seller user updated successfully', user });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
   }
    res.status(500).json({ success: false, error: err.message });
  }
}
export const sellerUserDelete = async (req,res) => {
    try {
     const seller = req.user;
    const roleDoc = await Role.findById(seller.role_id);

    if (!roleDoc) {
      return res.status(400).json({ success: false, error: 'Role not found for seller' });
    }

    if (roleDoc.role_type !== 'seller' && roleDoc.role_type !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only sellers/admin can create seller users' });
    }
    const {id} = req.params;
    const user = await User.findByIdAndDelete(id);

    res.json({ success: true, message: 'Seller user delete successfully', user });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
   }
    res.status(500).json({ success: false, error: err.message });
  }
}