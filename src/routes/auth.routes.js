import express from "express";
import { registerUser, loginUser, forgetPassword, resetPassword, createAdmin } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgetpassword", forgetPassword);
router.put("/resetpassword/:token", resetPassword);
router.post("/create-admin", createAdmin);

export default router;
