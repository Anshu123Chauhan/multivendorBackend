import express from 'express'
import {createCategory,listCategories,updateCategory,restoreCategory,softDeleteCategory} from './controller/index.js'
const router = express.Router();
import {upload} from '../../middleware/upload.js'

router.post('/', createCategory);
router.get('/', listCategories);
router.put('/:id', updateCategory);
router.delete('/:id', softDeleteCategory); // soft delete
router.post('/:id/restore', restoreCategory);
export default router;
