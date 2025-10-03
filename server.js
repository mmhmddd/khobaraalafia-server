// server.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary"; // Add Cloudinary import
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/auth.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import testimonialRoutes from "./src/routes/testimonial.routes.js";
import doctorRoutes from "./src/routes/doctorRoutes.js";
import clinicRoutes from "./src/routes/clinicRoutes.js";
import bookingRoutes from "./src/routes/bookingRoutes.js";
import path from "path";
import { fileURLToPath } from "url";

// fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// load .env file
dotenv.config();

const app = express();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("Cloudinary Config:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? "***" : undefined,
});

// log Nodemailer config
console.log("Nodemailer Config:", {
  host: process.env.EMAIL_HOST,
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS ? "********" : undefined,
});

// ✅ CORS settings to accept from any frontend
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // يسمح للـ Postman و السيرفرات الداخلية
    callback(null, true); // يسمح لأي دومين (Vercel, Netlify, IP مباشر)
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// No need for local static serve anymore (images on Cloudinary)
// Removed: app.use("/images", express.static(imagesDir)); etc.

// set base URL dynamically
app.use((req, res, next) => {
  res.locals.baseUrl =
    process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  next();
});

// connect to MongoDB
connectDB();

// routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api", doctorRoutes);
app.use("/api", clinicRoutes);
app.use("/api", bookingRoutes);

// root endpoint
app.get("/", (req, res) => res.send("🚀 Server running..."));

// start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));