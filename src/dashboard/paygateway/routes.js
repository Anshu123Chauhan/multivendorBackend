import express from 'express';
import {createpaymentsetting,getpaymentsettings,getpaymentsettingById} from './controller/index.js'
const router = express.Router();

router.post('/',createpaymentsetting)

