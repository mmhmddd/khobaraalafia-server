// src/controllers/user.controller.js
import User from "../models/User.js";

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  const { name, email, phone, address, age, role } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    user.age = age || user.age;
    user.role = role || user.role;

    await user.save();
    res.json({ message: "تم تحديث المستخدم", user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    await user.deleteOne();
    res.json({ message: "تم حذف المستخدم" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};