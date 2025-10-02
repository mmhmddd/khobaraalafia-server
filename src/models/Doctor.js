// Doctor.js model (updated for bilingual support)
import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: { 
      ar: { type: String, required: true },
      en: { type: String }
    },
    email: { type: String, unique: true },
    phone: { type: String, required: true },
    address: { 
      ar: { type: String, required: true },
      en: { type: String }
    },
    yearsOfExperience: { 
      type: Number, 
      required: true, 
      min: [0, 'Years of experience cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Years of experience must be an integer'
      }
    },
    specialization: { 
      ar: { type: String, enum: ["طب عام", "طب تخصصي"], required: true },
      en: { type: String, enum: ["General Medicine", "Specialized Medicine"] } // Optional
    },
    specialties: [{ 
      ar: { type: String, required: true },
      en: { type: String }
    }], 
    clinics: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Clinic",
      required: true 
    }],
    schedules: [
      {
        clinic: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "Clinic",
          required: false 
        },
        days: [{ 
          type: String, 
          required: true, 
          enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "All"] 
        }],
        startTime: { type: String, required: false }, 
        endTime: { type: String, required: false }, 
      },
    ],
    status: { 
      ar: { type: String, enum: ["متاح", "غير متاح"], default: "متاح" },
      en: { type: String, enum: ["Available", "Unavailable"], default: "Available" } // Optional, but defaults to match ar
    },
    image: { type: String },
    bookingsToday: { type: Number, default: 0 },
    bookingsLast7Days: { type: Number, default: 0 },
    bookingsLast30Days: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    about: { 
      ar: { type: String, required: true },
      en: { type: String }
    },
    specialWords: [{ 
      ar: { type: String, required: true },
      en: { type: String }
    }]
  },
  { timestamps: true }
);

doctorSchema.path('clinics').validate(function (value) {
  return value && value.length > 0;
}, 'يجب توفير عيادة واحدة على الأقل');

doctorSchema.path('specialWords').validate(function (value) {
  return value && value.length > 0;
}, 'يجب توفير كلمات خاصة واحدة على الأقل');

const Doctor = mongoose.model("Doctor", doctorSchema);
export default Doctor;