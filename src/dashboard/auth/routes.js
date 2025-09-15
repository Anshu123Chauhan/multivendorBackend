import express from 'express';
import { login } from './controller/index.js';

const router = express.Router();

router.post('/login', login);

export default router;

