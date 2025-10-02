import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Removed required: true
    clinic: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic", required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true }, // e.g., "09:00"
    clientName: { type: String, required: true },
    clientPhone: { type: String, required: true },
    clientAddress: { type: String, required: true },
    clientEmail: { type: String, required: true },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
    bookingNumber: { type: Number, required: true },
    confirmationCode: { type: String, required: true },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;