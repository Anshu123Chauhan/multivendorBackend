import Seller from "../../../models/Seller.js";
import Role from "../../../models/Role.js";
import Permission from "../../../models/Permission.js";
import User from "../../../models/User.js";
import Admin from "../../../models/admin.js";
import bcrypt from "bcrypt";

export const adminRegister = async (req, res) => {
  try {
    const { username, email, password, fullName, phone } = req.body;

    const existing = await Admin.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res
        .status(400)
        .json({ error: "Username or Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new Admin({
      username,
      email,
      password: hashedPassword,
      fullName,
      phone,
      isActive: true,
    });

    await admin.save();

    const adminRole = new Role({
      role_type: "admin",
      parent_type: "admin",
      user_id: admin._id,
      system: true,
    });
    await adminRole.save();
    res.json({ message: "Admin created successfully", admin });
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
      addressProof,
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
      addressProof,
    });

    await seller.save();

    res.json({ success: true, message: "Seller created successfully", seller });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};
export const sellerListing = async (req, res) => {
  try {
    const sellerList = await Seller.find();
    res.json({ success: true, message: "Seller get successfully", sellerList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const userRegister = async (req, res) => {
  try {
    const activeUser = req.user;

    if (activeUser.userType !== "Seller" && activeUser.userType !== "Admin") {
      return res
        .status(403)
        .json({
          success: false,
          error: "Only sellers/admin can create seller users",
        });
    }

    const { username, phone, email, password, role_id } = req.body;
    if (!role_id)
      return res
        .status(400)
        .json({ success: false, error: "role_id is required" });
    const role = role_id && (await Role.findById(role_id));

    if (!role) {
      return res.status(400).json({ success: false, error: "Role not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      phone,
      password: hashedPassword,
      role_id: role._id,
      parent_type: activeUser.userType,
      parent_id: activeUser._id,
    });

    await user.save();

    res.json({
      success: true,
      message: `${activeUser.userType} user created successfully`,
      user,
    });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

export const userGet = async (req,res) => {
   try {
     const activeUser = req.user;
     const {id} = req.params;

    if (activeUser.userType !== "Seller" && activeUser.userType !== "Admin") {
      return res
        .status(403)
        .json({
          success: false,
          error: "Only sellers/admin can create seller users",
        });
    }
    const user = await User.findById(id);

    res.json({ success: true, message: 'user fetch successfully', user });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
   }
    res.status(500).json({ success: false, error: err.message });
  }
}
export const userList = async (req,res) => {
   try {
     const activeUser = req.user;

    if (activeUser.userType !== "Seller" && activeUser.userType !== "Admin") {
      return res
        .status(403)
        .json({
          success: false,
          error: "Only sellers/admin can create seller users",
        });
    }
    const user = await User.find({parent_type: activeUser.userType, parent_id: activeUser._id}).select("-__v -password").lean();

    res.json({ success: true, message: 'user fetch successfully', user });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
   }
    res.status(500).json({ success: false, error: err.message });
  }
}
export const userUpdate = async (req,res) => {
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
export const userDelete = async (req,res) => {
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

export const assignRoleAndPermission = async (req, res) => {
  try {
    let user = req.user;
    const {
      role_name,
      role_type = "User",
      parent_type = user.userType,
      permissions = [],
    } = req.body;
    const r = new Role({
      user_id: user._id,
      role_name,
      role_type,
      parent_type,
      system: false,
    });
    await r.save();
    const roleId = r._id;
    for (const p of permissions) {
      await Permission.findOneAndUpdate(
        { role_id: roleId, tab_name: p.tab_name },
        {
          $set: {
            p_read: !!p.p_read,
            p_write: !!p.p_write,
            p_update: !!p.p_update,
            p_delete: !!p.p_delete,
          },
        },
        { upsert: true }
      );
    }
    res.json({
      success: true,
      message: "Permission assigned to role by Admin",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
export const getRoleAndPermission = async (req, res) => {
  try {
    const user = req.user;

    const roles = await Role.find({ user_id: user._id, isActive: true }).select("-__v").lean();

    const roleWithPermissions = await Promise.all(
      roles.map(async (r) => {
        const permissions = await Permission.find({ role_id: r._id }).select("-__v").lean();
        return {
          ...r,
          permissions
        };
      })
    );

    res.json({
      success: true,
      data: roleWithPermissions,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
