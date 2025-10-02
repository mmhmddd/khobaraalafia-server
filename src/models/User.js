import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    age: { type: Number, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },

    // الحجوزات كلها بتفاصيلها
    reservations: [
      {
        doctorName: String,
        date: Date,
        time: String,
        notes: String,
        status: {
          type: String,
          enum: ["pending", "confirmed", "cancelled"],
          default: "pending",
        },
      },
    ],

    // الكارت بتاع المستخدم
    cart: [
      {
        itemId: String, // ID للعنصر (دواء، خدمة... إلخ)
        name: String,
        quantity: Number,
        price: Number,
      },
    ],

    // المفضلة
    favourite: [
      {
        itemId: String,
        name: String,
        type: String, // نوع العنصر (دواء، خدمة... إلخ)
      },
    ],

    // أسماء الدكاترة اللي عنده حجوزات معاهم
    doctors: [String],

    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// hashing كلمة المرور قبل الحفظ
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// طريقة لمقارنة كلمة المرور
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
