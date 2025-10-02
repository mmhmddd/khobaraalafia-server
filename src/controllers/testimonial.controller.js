import Testimonial from "../models/testimonial.model.js";
import asyncHandler from "express-async-handler";

// Create a new testimonial (Admin only)
const createTestimonial = asyncHandler(async (req, res) => {
  const { name, jobTitle, text, rating } = req.body;

  const testimonial = await Testimonial.create({
    name,
    jobTitle,
    text,
    rating
  });

  res.status(201).json({
    success: true,
    data: testimonial,
    message: "تم إنشاء الرأي بنجاح"
  });
});

// Delete a testimonial (Admin only)
const deleteTestimonial = asyncHandler(async (req, res) => {
  const testimonial = await Testimonial.findById(req.params.id);

  if (!testimonial) {
    res.status(404);
    throw new Error("الرأي غير موجود");
  }

  await testimonial.deleteOne();
  res.status(200).json({
    success: true,
    message: "تم حذف الرأي بنجاح"
  });
});

// Update a testimonial (Admin only)
const updateTestimonial = asyncHandler(async (req, res) => {
  const { name, jobTitle, text, rating } = req.body;

  const testimonial = await Testimonial.findById(req.params.id);

  if (!testimonial) {
    res.status(404);
    throw new Error("الرأي غير موجود");
  }

  testimonial.name = name || testimonial.name;
  testimonial.jobTitle = jobTitle || testimonial.jobTitle;
  testimonial.text = text || testimonial.text;
  testimonial.rating = rating || testimonial.rating;

  const updatedTestimonial = await testimonial.save();

  res.status(200).json({
    success: true,
    data: updatedTestimonial,
    message: "تم تحديث الرأي بنجاح"
  });
});

// Get a single testimonial
const getTestimonial = asyncHandler(async (req, res) => {
  const testimonial = await Testimonial.findById(req.params.id);

  if (!testimonial) {
    res.status(404);
    throw new Error("الرأي غير موجود");
  }

  res.status(200).json({
    success: true,
    data: testimonial
  });
});

// Get all testimonials
const getAllTestimonials = asyncHandler(async (req, res) => {
  const testimonials = await Testimonial.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: testimonials.length,
    data: testimonials
  });
});

export {
  createTestimonial,
  deleteTestimonial,
  updateTestimonial,
  getTestimonial,
  getAllTestimonials
};