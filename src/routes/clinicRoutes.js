// clinicRoutes.js
import express from "express";
import { getClinics, getClinicById, createClinic, updateClinic, deleteClinic, addDoctorsToClinic, deleteClinicVideo } from "../controllers/clinicController.js";
import { protect, admin } from "../middlewares/auth.middleware.js";
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary'; // Add Cloudinary storage
import { v2 as cloudinary } from 'cloudinary'; // Import cloudinary

const router = express.Router();

// Configure multer with Cloudinary storage for videos
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'khobaraalafia/clinics/videos', // Folder in Cloudinary (customize as needed)
    allowed_formats: ['mp4', 'avi', 'mov'], // Video formats
    resource_type: 'video', // Specify video resource type
    transformation: [{ quality: 'auto:good' }] // Optional: auto-optimize video
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit for videos
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, AVI, and MOV are allowed.'), false);
    }
  }
}).array('videos', 10); // Up to 10 videos

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