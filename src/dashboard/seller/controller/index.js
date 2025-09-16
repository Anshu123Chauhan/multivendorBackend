import User from '../../../models/User.js';
import Role from '../../../models/Role.js';
import Permission from '../../../models/Permission.js';
import Seller from '../../../models/Seller.js';

export const sellerUserRegister = async (req, res) => {
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

    const role =
      (role_id && await Role.findById(role_id)) ||
      (await Role.findOne({ role_type: 'custom' }));

    if (!role) {
      return res.status(400).json({ success: false, error: 'Role not found' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      role_id: role._id,
      parent_id: seller._id, 
      seller_id: seller._id  
    });

    await user.save();

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

    res.json({ success: true, message: 'Seller user created successfully', user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export const sellerUserUpdate = async (req, res) => {
  try {
    const seller = req.user;
    const roleId = req.params.roleId;
    const roleToModify = await Role.findById(roleId);
    if (!roleToModify) return res.status(404).json({ error: 'Role not found' });
    if (roleToModify.seller_id && seller.seller_id && roleToModify.seller_id.toString() !== seller.seller_id.toString()) {
      return res.status(403).json({ error: 'Cannot modify role outside your seller scope' });
    }
    const { tab_name, p_read, p_write, p_update, p_delete } = req.body;
    await Permission.findOneAndUpdate({ role_id: roleId, tab_name }, { $set: { p_read: !!p_read, p_write: !!p_write, p_update: !!p_update, p_delete: !!p_delete } }, { upsert: true });
    res.json({ success: true, message: 'Role permission set' });
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

    const sellerRole = new Role({
      role_type: 'seller',
      parent_type: 'admin',
      user_id: seller._id,
      system: false
    });
    await sellerRole.save();
    const sellerUser = new User({
        username: fullName,
        email,
        password,
        phone,
        isActive: true,
        role_type: "seller",
        role_id: sellerRole._id
    });
    await sellerUser.save();
    res.json({ success: true, message: 'Seller created successfully', seller });
  } catch (err) {
    res.status(500).json({success:false, error: err.message });
  }
}