import express from "express";
import { getClinics, getClinicById, createClinic, updateClinic, deleteClinic, addDoctorsToClinic, deleteClinicVideo } from "../controllers/clinicController.js";
import { protect, admin } from "../middlewares/auth.middleware.js";
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const videosDir = path.join(process.cwd(), 'videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
  console.log('Created videos directory:', videosDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'videos/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, AVI, and MOV are allowed.'), false);
    }
  }
}).array('videos', 10);

const router = express.Router();

// Multer error handling middleware
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `خطأ في رفع الملف: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

router.get("/clinics", getClinics);
router.get("/clinics/:id", getClinicById);
router.post("/clinics", protect, admin, upload, multerErrorHandler, createClinic);
router.put("/clinics/:id", protect, admin, upload, multerErrorHandler, updateClinic);
router.delete("/clinics/:id", protect, admin, deleteClinic);
router.post("/clinics/:id/add-doctors", protect, admin, addDoctorsToClinic);
router.delete("/clinics/:clinicId/videos/:videoId", protect, admin, deleteClinicVideo);

export default router;