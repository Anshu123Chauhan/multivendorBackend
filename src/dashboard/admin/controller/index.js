import Seller from "../../../models/Seller.js";
import Role from "../../../models/Role.js";
import Permission from "../../../models/Permission.js";
import User from "../../../models/User.js";
import Admin from "../../../models/admin.js";
import { mongoose } from "mongoose";
import Customer from "../../../models/customer.js";
import { Order } from "../../../models/Order.js";
import { Product } from "../../../models/Product.js";
import { Category } from "../../../models/Category.js";

export const adminRegister = async (req, res) => {
  try {
    const { username, email, password, fullName, phone } = req.body;

    const existing = await Admin.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res
        .status(400)
        .json({ error: "Username or Email already exists" });
    }

    const admin = new Admin({
      username,
      email,
      password,
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
    const sellerList = await Seller.find({isDeleted: false});
    res.json({ success: true, message: "Seller fetch successfully", sellerList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
export const customerListing = async (req, res) => {
  try {
    const activeUser = req.user;
    const query = {};
    if(activeUser.userType === 'Seller' || (activeUser.userType === 'User' && activeUser.parent_type === 'Seller')){
      const orderQuery = {sellerId: activeUser.userType === 'Seller' ? activeUser._id : activeUser.parent_id};
      const ordersCustomerList = await Order.find(orderQuery).select('customerId');
      const customerIds = [
        ...new Set(ordersCustomerList.map((order) => order.customerId?.toString()).filter(Boolean)),
      ];
      query._id = { $in: customerIds };
    }
    const customerList = await Customer.find(query).select("-password -__v");
    res.json({ success: true, message: "Customer fetch successfully", customerList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
export const Analytics = async (req, res) => {
  try {
    const [customerCount, categoryCount, productCount, sellerCount, orderCount] = await Promise.all([
      Customer.countDocuments(),
      Category.countDocuments(),
      Product.countDocuments(),
      Seller.countDocuments(),
      Order.countDocuments(),
    ]);
    res.json({ success: true, message: "fetch successfully", customerCount,categoryCount,productCount,sellerCount,orderCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const ordersofSellerAnalytics = async (req, res) => {
  try {
    let { sellerId, currentMonth } = req.query;
    if (!currentMonth) {
      currentMonth = new Date();
    } else {
      currentMonth = new Date(currentMonth);
    }
    // currentMonth.setDate(1);
    // currentMonth.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth()+1, 1);
    const startOfNextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 1);
    console.log("Date range:", startOfMonth, startOfNextMonth);

    const matchQuery = { createdAt: { $gte: startOfMonth, $lt: startOfNextMonth } };
    
    if (sellerId) {
      if (mongoose.Types.ObjectId.isValid(sellerId)) {
        matchQuery.sellerId = new mongoose.Types.ObjectId(sellerId);
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid sellerId format"
        });
      }
    }
    const result = await Order.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          dayWiseOrders: [
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                },
                count: { $sum: 1 }
              }
            },
            {
              $project: {
                _id: 0,
                date: "$_id",
                count: 1
              }
            },
            { $sort: { date: 1 } }
          ],
          totalCount: [
            {
              $count: "total"
            }
          ]
        }
      }
    ]);
    
    const dayWiseOrders = result[0].dayWiseOrders || [];
    const totalNumberOfOrders = result[0].totalCount[0]?.total || 0;
    
    res.json({
      success: true,
      message: "Fetched successfully",
      orders: dayWiseOrders,
      numberOfDays: dayWiseOrders.length,
      totalNumberOfOrders
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const orderTrackingofSellerAnalytics = async (req, res) => {
  try {
    let { sellerId, currentMonth } = req.query;
    if (!currentMonth) {
      currentMonth = new Date();
    } else {
      currentMonth = new Date(currentMonth);
      if (isNaN(currentMonth.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid currentMonth date"
        });
      }
    }
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const startOfNextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 1);
    console.log("Date range:", startOfMonth, startOfNextMonth);

    const query = { createdAt: { $gte: startOfMonth, $lt: startOfNextMonth } };
    if(sellerId) query.sellerId = sellerId;
    const orders = await Order.find(query).select("status");
    let delivered = 0,
      canceled = 0,
      pending = 0;
    orders.forEach((order) => {
      if (order.status === "delivered") delivered++;
      else if (order.status === "canceled") canceled++;
      else pending++;
    });

    const total = orders.length;

    res.json({
      success: true,
      message: "Fetched successfully",
      totalOrders: total,
      delivered,
      canceled,
      pending,
    });
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

    const { username, phone, email, password, role_id, isActive } = req.body;
    if (!role_id)
      return res
        .status(400)
        .json({ success: false, error: "role_id is required" });
    const role = role_id && (await Role.findById(role_id));

    if (!role) {
      return res.status(400).json({ success: false, error: "Role not found" });
    }

    const user = new User({
      username,
      email,
      phone,
      password,
      role_id: role._id,
      parent_type: activeUser.userType,
      parent_id: activeUser._id,
      isActive
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
          error: "Only sellers/admin can get users",
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
export const customerGet = async (req,res) => {
   try {
     const activeUser = req.user;
     const {id} = req.params;
    const customer = await Customer.findById(id).select("-__v -password");
    const orderQuery = {};
    if (activeUser.userType === "Seller" || ( activeUser.userType === "User" && activeUser.parent_type !== "Seller" )) {
      orderQuery.sellerId =
        activeUser.userType === "Seller"
          ? activeUser._id
          : activeUser.parent_id;
    }
    orderQuery.customerId = id;
    const orders = await Order.find(orderQuery);
    res.json({ success: true, message: 'customer fetch successfully', customer, orders });
  } catch (err) {
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
          error: "Only sellers/admin can get users",
        });
    }
    const user = await User.find({parent_type: activeUser.userType, parent_id: activeUser._id}).select("-__v -password").lean().populate("role_id", "-__v") ;

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
    const activeUser = req.user;
    const {id} = req.params;
    const { username, phone, email, role_id, isActive } = req.body;

    if (activeUser.userType !== "Seller" && activeUser.userType !== "Admin") {
      return res
        .status(403)
        .json({
          success: false,
          error: "Only sellers/admin can edit users",
        });
    }
    const updateData = {};
    if (username) updateData.username = username;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;
    if (role_id) updateData.role_id = role_id;
    if (isActive) updateData.isActive = isActive;
    const user = await User.findOneAndUpdate(
      {
        parent_type: activeUser.userType,
        parent_id: activeUser._id,
        _id: new mongoose.Types.ObjectId(id),
      },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if(user){
      return res.json({ success: true, message: 'user updated successfully', user });
    }
    return res.json({ success: false, message: `user not found or ${activeUser.userType} not authorized ` });
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
    const activeUser = req.user;
    const {id} = req.params;

    if (activeUser.userType !== "Seller" && activeUser.userType !== "Admin") {
      return res
        .status(403)
        .json({
          success: false,
          error: "Only sellers/admin can edit users",
        });
    }
    const user = await User.findOneAndDelete(
      {
        parent_type: activeUser.userType,
        parent_id: activeUser._id,
        _id: new mongoose.Types.ObjectId(id),
      },
    );
    if(user){
      return res.json({ success: true, message: 'user deleted successfully' });
    }
    return res.json({ success: false, message: `user not found or ${activeUser.userType} not authorized ` });
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
      parent_id: user._id,
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
export const getRoleAndPermissions = async (req, res) => {
  try {
    const user = req.user;

    const roles = await Role.find({ parent_id: user._id, isActive: true }).select("-__v").lean();

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
export const getRoleAndPermission = async (req, res) => {
  try {
    const activeUser = req.user;
    const {id} = req.params;

    if (activeUser.userType !== "Seller" && activeUser.userType !== "Admin") {
      return res
        .status(403)
        .json({
          success: false,
          error: "Only sellers/admin can edit users",
        });
    }
    const role = await Role.findById(id).select("-__v").lean();
    const permissions = await Permission.find({ role_id: role._id }).select("-__v").lean();
    const data = {roleName: role.role_name, permissions };
    res.json({
      success: true,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
export const updateRoleAndPermission = async (req, res) => {
  try {
    let user = req.user;
    const {
      role_name,
      permissions = [],
    } = req.body;
    const { id } = req.params;
    const newRoleData = {};
    if(role_name) newRoleData.role_name = role_name;
    const r = await Role.findOneAndUpdate(
      {
        parent_type: user.userType,
        parent_id: user._id,
        _id: new mongoose.Types.ObjectId(id)
      }, newRoleData
     );
    await r.save();
    for (const p of permissions) {
      await Permission.findOneAndUpdate(
        { role_id: id, tab_name: p.tab_name },
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
      message: `Permission updated to role by ${user.userType}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
export const deleteRoleAndPermission = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = req.user;
    const {id} = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, error: "Invalid role ID" });
    }
    const role = await Role.findOneAndDelete(
      {
        parent_id: user._id, parent_type: user.userType, _id: new mongoose.Types.ObjectId(id)
      },
      { session });
    if (!role) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, error: "Role not found" });
    }
    await Permission.deleteMany({ role_id: id },{ session });
    await session.commitTransaction();
    session.endSession();
    res.json({
      success: true,
      message: `Permissions deleted to role by ${user.userType}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};



export const updatePassword = async (req, res) => {
  try {
    const activeUser = req.user; 
    const {password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: "new password are required" });
    }


    let Model;
    if (activeUser.userType === "Admin") {
      Model = Admin;
    } else if (activeUser.userType === "Seller") {
      Model = Seller;
    } else if (activeUser.userType === "User") {
      Model = User;
    } else {
      return res.status(400).json({ success: false, message: "Invalid user type" });
    }

    const user = await Model.findById(activeUser._id).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }



    user.password = password;
    await user.save();

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
