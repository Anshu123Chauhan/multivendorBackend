import express from 'express';
import { sellerRegister, sellerListing, userRegister, assignRoleAndPermission, adminRegister,
    userGet,userUpdate,userDelete } from './controller/index.js';

const router = express.Router();

router.post('/register',adminRegister);
router.post('/seller-register', sellerRegister);
router.get('/seller-List', sellerListing);
router.post('/user-register', userRegister);
router.get('/user-get/:id', userGet);
router.put('/user-update', userUpdate);
router.delete('/user-delete', userDelete);
router.post('/role-permission', assignRoleAndPermission);

export default router;

