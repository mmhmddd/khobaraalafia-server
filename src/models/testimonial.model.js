import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "الاسم مطلوب"],
    trim: true,
    minlength: [2, "الاسم قصير جدًا"],
    maxlength: [50, "الاسم طويل جدًا"]
  },
  jobTitle: {
    type: String,
    required: [true, "المسمى المهني مطلوب"],
    trim: true,
    maxlength: [100, "المسمى المهني طويل جدًا"]
  },
  text: {
    type: String,
    required: [true, "نص الرأي مطلوب"],
    trim: true,
    minlength: [5, "نص الرأي قصير جدًا"],
    maxlength: [10000 ,"نص الرأي طويل جدًا"]
  },
  rating: {
    type: Number,
    required: [true, "التقييم مطلوب"],
    min: [1, "التقييم يجب أن يكون بين 1 و 5"],
    max: [5, "التقييم يجب أن يكون بين 1 و 5"]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Testimonial", testimonialSchema);