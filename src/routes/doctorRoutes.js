// doctorRoutes.js
import express from "express";
import { getDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor } from "../controllers/doctorController.js";
import { protect, admin } from "../middlewares/auth.middleware.js";
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary'; // Add Cloudinary storage
import { v2 as cloudinary } from 'cloudinary'; // Import cloudinary

const router = express.Router();

// Configure multer with Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'khobaraalafia/doctors', // Folder in Cloudinary (customize as needed)
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }] // Optional: auto-resize
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'), false);
    }
  }
});

router.get("/doctors", getDoctors);
router.get("/doctors/:id", getDoctorById);
router.post("/doctors", protect, admin, upload.single('image'), createDoctor);
router.put("/doctors/:id", protect, admin, upload.single('image'), updateDoctor);
router.delete("/doctors/:id", protect, admin, deleteDoctor);

export default router;