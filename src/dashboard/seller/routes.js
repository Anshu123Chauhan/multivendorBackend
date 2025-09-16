import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { sellerUserRegister, sellerUserPermission, sellerRegister, updateSeller, getSeller, deleteSeller,
    sellerUserGet,sellerUserUpdate,sellerUserDelete } from './controller/index.js';

const router = express.Router();

router.post('/user-register', authenticate, sellerUserRegister);
router.get('/user-get/:id', authenticate, sellerUserGet);
router.put('/user-update', authenticate, sellerUserUpdate);
router.delete('/user-delete', authenticate, sellerUserDelete);
router.post('/register', sellerRegister)
router.put('/update/:id',authenticate, updateSeller)
router.put('/get/:id',authenticate, getSeller)
router.delete('/delete/:id',authenticate, deleteSeller)
router.post('/role/:roleId/permission', authenticate, sellerUserPermission);

export default router;

