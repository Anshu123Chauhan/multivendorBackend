import express from 'express';
import multer from "multer";
import { sellerRegister, sellerListing, customerListing, userRegister, customerGet, 
    assignRoleAndPermission, adminRegister, userGet, userList, userUpdate, userDelete,
    getRoleAndPermissions,ordersofSellerAnalytics,orderTrackingofSellerAnalytics, Analytics,
    getRoleAndPermission, updateRoleAndPermission, deleteRoleAndPermission, updatePassword,createSellerCategory,editSellerCategory,deleteSellerCategory,listSellerCategory,importSeller,sellerStatusToggle,sellerLoginByAdmin
 } from './controller/index.js';
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post('/register',adminRegister);
router.post('/seller-register', sellerRegister);
router.get('/seller-List', sellerListing);
router.get('/customer-List', customerListing);
router.post('/user-register', userRegister);
router.get('/customer-get/:id', customerGet);
router.get('/user-get/:id', userGet);
router.get('/user-list', userList);
router.get('/analytics', Analytics);
router.get('/orders-analytics', ordersofSellerAnalytics);
router.get('/order-tracking-analytics', orderTrackingofSellerAnalytics);
router.put('/user-update/:id', userUpdate);
router.delete('/user-delete/:id', userDelete);
router.post('/role-permission', assignRoleAndPermission);
router.get('/role-permission', getRoleAndPermissions);
router.get('/role-permission/:id', getRoleAndPermission);
router.put('/role-permission/:id', updateRoleAndPermission);
router.delete('/role-permission/:id', deleteRoleAndPermission);
router.put('/updatepassword',updatePassword)
router.post('/seller-category', createSellerCategory);
router.put('/editSellerCategory/:id', editSellerCategory);
router.delete('/deleteSellerCategory/:id', deleteSellerCategory);
router.get('/list-seller-categories',listSellerCategory )
router.post('/import-sellers', upload.single("file"),importSeller)
router.put('/sellerStatusToggle/:id',sellerStatusToggle)
router.post('/sellerLoginByAdmin/:id', sellerLoginByAdmin)
// router.get('/sellerCategoryCount',sellerCategoryCount)

export default router;

