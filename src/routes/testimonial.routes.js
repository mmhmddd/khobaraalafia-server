import express from "express";
import {
  createTestimonial,
  deleteTestimonial,
  updateTestimonial,
  getTestimonial,
  getAllTestimonials
} from "../controllers/testimonial.controller.js";
import { protect, admin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getAllTestimonials);
router.get("/:id", getTestimonial);

router.post("/", protect, admin, createTestimonial);
router.delete("/:id", protect, admin, deleteTestimonial);
router.put("/:id", protect, admin, updateTestimonial);

export default router;