import express from "express";
import {
  getValidDates,
  createBooking,
  getMyBookings,
  cancelBooking,
  getAllBookings,
} from "../controllers/bookingController.js";
import { protect, admin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/bookings/valid-dates", protect, getValidDates); // Keep protect for other routes if needed
router.post("/bookings", createBooking); // Removed protect middleware
router.get("/bookings/my", protect, getMyBookings);
router.put("/bookings/:id/cancel", protect, cancelBooking);
router.get("/bookings", protect, admin, getAllBookings);

export default router;