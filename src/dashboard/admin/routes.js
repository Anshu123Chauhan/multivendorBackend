import express from 'express';
import { sellerRegister, sellerListing, userRegister, assignRoleAndPermission, adminRegister } from './controller/index.js';

const router = express.Router();

router.post('/register',adminRegister);
router.post('/seller-register', sellerRegister);
router.get('/seller-List', sellerListing);
router.post('/user-register', userRegister);
router.post('/role-permission', assignRoleAndPermission);

export default router;

