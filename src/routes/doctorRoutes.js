// doctorRoutes.js (unchanged, as no new routes needed)
import express from "express";
import { getDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor } from "../controllers/doctorController.js";
import { protect, admin } from "../middlewares/auth.middleware.js";
import multer from 'multer';
import fs from 'fs'; // For directory creation
import path from 'path';

// Ensure images directory exists
const imagesDir = path.join(process.cwd(), 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log('Created images directory:', imagesDir);
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images/'); // Folder to store images (relative to cwd)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname); // Unique filename
  }
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

const router = express.Router();

router.get("/doctors", getDoctors);
router.get("/doctors/:id", getDoctorById);
router.post("/doctors", protect, admin, upload.single('image'), createDoctor); // Add upload middleware
router.put("/doctors/:id", protect, admin, upload.single('image'), updateDoctor); // Add upload middleware
router.delete("/doctors/:id", protect, admin, deleteDoctor);

export default router;