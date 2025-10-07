import express from "express";
import { getClinics, getClinicById, createClinic, updateClinic, deleteClinic, addDoctorsToClinic, deleteClinicVideo } from "../controllers/clinicController.js";
import { protect, admin } from "../middlewares/auth.middleware.js";
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'khobaraalafia/clinics/videos',
    allowed_formats: ['mp4', 'avi', 'mov'],
    resource_type: 'video',
    transformation: [{ quality: 'auto:good' }]
  },
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