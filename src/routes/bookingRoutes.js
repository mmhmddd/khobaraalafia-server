import express from "express";
import {
  getValidDates,
  createBooking,
  getMyBookings,
  cancelBooking,
  deleteBooking,
  getAllBookings,
} from "../controllers/bookingController.js";
import { protect, admin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/bookings/valid-dates", protect, getValidDates);
router.post("/bookings", createBooking);
router.get("/bookings/my", protect, getMyBookings);
router.put("/bookings/:id/cancel", protect, cancelBooking);
router.delete("/bookings/:id", protect, deleteBooking);
router.get("/bookings", protect, admin, getAllBookings);

export default router;