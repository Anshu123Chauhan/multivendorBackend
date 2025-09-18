import express from 'express';
import { sellerRegister, sellerListing, userRegister, assignRoleAndPermission, adminRegister,
    userGet, userList, userUpdate, userDelete, getRoleAndPermission } from './controller/index.js';

const router = express.Router();

router.post('/register',adminRegister);
router.post('/seller-register', sellerRegister);
router.get('/seller-List', sellerListing);
router.post('/user-register', userRegister);
router.get('/user-get/:id', userGet);
router.get('/user-list', userList);
router.put('/user-update/:id', userUpdate);
router.delete('/user-delete/:id', userDelete);
router.post('/role-permission', assignRoleAndPermission);
router.get('/role-permission', getRoleAndPermission);

export default router;

