import User from "../models/User.js";
import { generateToken } from "../config/jwt.js";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";

// Register user
export const registerUser = async (req, res) => {
  const { name, email, password, phone, address, age, role } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "المستخدم موجود بالفعل" });

    user = new User({ name, email, password, phone, address, age, role: role || "user" });
    await user.save();

    const token = generateToken(user);
    res.status(201).json({ token, user: { id: user._id, name, email, role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login user
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "بيانات خاطئة" });
    }

    const token = generateToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Forget password
export const forgetPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    const resetUrl = `http://localhost:${process.env.PORT}/api/auth/resetpassword/${resetToken}`;
    const message = `رابط إعادة تعيين كلمة المرور: ${resetUrl}`;

    await sendEmail({
      to: user.email,
      subject: "إعادة تعيين كلمة المرور",
      text: message,
    });

    res.json({ message: "تم إرسال الإيميل" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "توكن غير صالح أو منتهي" });

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: "تم إعادة تعيين كلمة المرور" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAdmin = async (req, res) => {
  res.json({ message: "استخدم /register مع role: admin" });
};
