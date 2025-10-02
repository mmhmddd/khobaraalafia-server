import mongoose from "mongoose";

const clinicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String }, 
    phone: { type: String, required: true },
    address: { type: String },
    specializationType: { type: String, enum: ["general", "specialized"], required: true },
    specialties: [{ type: String }],
    status: { type: String, enum: ["active", "inactive"], required: true, default: "active" },
    availableDays: [{ 
      type: String, 
      required: true, 
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "All"] 
    }],
    price: { type: Number },
    bookingsToday: { type: Number, default: 0 },
    bookingsLast7Days: { type: Number, default: 0 },
    bookingsLast30Days: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    about: { type: String, required: true },
    specialWords: [{ type: String }],
    videos: [{
      path: { type: String },
      label: { type: String, required: true }
    }]
  },
  { timestamps: true }
);

clinicSchema.path('availableDays').validate(function (value) {
  return value && value.length > 0;
}, 'يجب تحديد يوم واحد على الأقل أو \'All\'');

const Clinic = mongoose.model("Clinic", clinicSchema);
export default Clinic;