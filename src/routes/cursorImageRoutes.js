// src/routes/cursorImageRoutes.js
import express from 'express';
import {
  createCursorImage,
  getAllCursorImages,
  getCursorImageById,
  updateCursorImage,
  deleteCursorImage,
} from '../controllers/cursorImageController.js';

const router = express.Router();

router.get('/', getAllCursorImages);
router.get('/:id', getCursorImageById);

router.post('/', createCursorImage);
router.put('/:id', updateCursorImage);
router.delete('/:id', deleteCursorImage);

export default router;