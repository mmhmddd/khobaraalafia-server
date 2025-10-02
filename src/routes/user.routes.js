// src/routes/user.routes.js
import express from "express";
import { getAllUsers, getUserById, updateUser, deleteUser } from "../controllers/user.controller.js";
import { protect, admin } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", protect, admin, getAllUsers);
router.get("/:id", protect, admin, getUserById);
router.put("/:id", protect, admin, updateUser);
router.delete("/:id", protect, admin, deleteUser);

export default router;