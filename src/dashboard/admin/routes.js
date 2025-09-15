import express from 'express';
import { sellerRegister, userRegister, assignRole, assignPermission } from './controller/index.js';

const router = express.Router();

router.post('/seller', sellerRegister);
router.post('/user', userRegister);
router.post('/role', assignRole);
router.post('/role/:roleId/permission', assignPermission);

export default router;

