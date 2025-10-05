import mongoose from "mongoose";
import Clinic from "../models/Clinic.js";
import Doctor from "../models/Doctor.js";
import { v2 as cloudinary } from 'cloudinary'; // Add for optional delete

const parseJsonField = (body, field) => {
  try {
    const value = body[field];
    if (Array.isArray(value)) {
      return value; 
    }
    return value ? JSON.parse(value) : [];
  } catch (error) {
    console.error(`Error parsing ${field}:`, error);
    return [];
  }
};

// Get all clinics (videos paths are full Cloudinary URLs, no helper needed)
export const getClinics = async (req, res) => {
  try {
    const clinics = await Clinic.find({});
    const clinicsWithDoctors = await Promise.all(
      clinics.map(async (clinic) => {
        const doctors = await Doctor.find({ clinics: clinic._id })
          .populate("clinics")
          .populate("schedules.clinic");
        return { 
          ...clinic.toObject(), 
          doctors: doctors, 
          videos: clinic.videos.map(video => ({
            _id: video._id,
            path: video.path, 
            label: video.label
          }))
        };
      })
    );
    res.json(clinicsWithDoctors);
  } catch (error) {
    console.error("Error in getClinics:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get one clinic by ID
export const getClinicById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "معرف العيادة غير صالح" });
    }
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) {
      return res.status(404).json({ message: "العيادة غير موجودة" });
    }
    const doctors = await Doctor.find({ clinics: clinic._id })
      .populate("clinics")
      .populate("schedules.clinic");
    res.json({ 
      ...clinic.toObject(), 
      doctors: doctors, // Doctors already have Cloudinary image URLs
      videos: clinic.videos.map(video => ({
        _id: video._id,
        path: video.path, // Full Cloudinary URL
        label: video.label
      }))
    });
  } catch (error) {
    console.error("Error in getClinicById:", error);
    res.status(500).json({ message: error.message });
  }
};

// Create a clinic
export const createClinic = async (req, res) => {
  const {
    name,
    email,
    phone,
    address,
    specializationType,
    specialties,
    status,
    availableDays,
    price,
    about,
    specialWords,
    videoLabels
  } = req.body;

  let videoObjects = [];
  if (req.files && req.files.length > 0) {
    const labels = parseJsonField(req.body, 'videoLabels');
    if (labels.length !== req.files.length) {
      return res.status(400).json({ message: "عدد التسميات لا يتطابق مع عدد الفيديوهات المرفوعة" });
    }
    videoObjects = req.files.map((file, index) => ({
      path: file.path, // Cloudinary secure URL
      label: labels[index] || `Video ${index + 1}`
    }));
    console.log('Uploaded videos to Cloudinary:', videoObjects.map(v => v.path));
  }

  try {
    if (email) {
      const clinic = await Clinic.findOne({ email });
      if (clinic) {
        return res.status(400).json({ message: "العيادة موجودة بالفعل" });
      }
    }

    if (!name || !phone || !specializationType || !status || !availableDays || !about) {
      return res.status(400).json({ message: "الحقول المطلوبة مفقودة" });
    }

    const parsedSpecialties = parseJsonField(req.body, 'specialties');
    const parsedAvailableDays = parseJsonField(req.body, 'availableDays');
    const parsedSpecialWords = parseJsonField(req.body, 'specialWords');

    const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "All"];
    if (!parsedAvailableDays || !Array.isArray(parsedAvailableDays) || parsedAvailableDays.length === 0) {
      return res.status(400).json({ message: "يجب تحديد يوم واحد على الأقل أو 'All'" });
    }
    if (!parsedAvailableDays.every(day => validDays.includes(day))) {
      return res.status(400).json({ message: "أيام غير صالحة" });
    }

    if (specializationType === "specialized" && (!parsedSpecialties || !Array.isArray(parsedSpecialties) || parsedSpecialties.length === 0)) {
      return res.status(400).json({ message: "يجب توفير قائمة التخصصات للعيادة المتخصصة" });
    }

    if (parsedSpecialWords.some(word => typeof word !== 'string' || word.trim().length < 1)) {
      return res.status(400).json({ message: "الكلمات الخاصة يجب أن تكون نصوصًا غير فارغة" });
    }

    const clinic = new Clinic({
      name,
      email: email || undefined, 
      phone,
      address,
      specializationType,
      specialties: specializationType === "specialized" ? parsedSpecialties : [],
      status,
      availableDays: parsedAvailableDays,
      price,
      about,
      specialWords: parsedSpecialWords || [],
      videos: videoObjects
    });
    await clinic.save();

    res.status(201).json({
      ...clinic.toObject(),
      videos: clinic.videos.map(video => ({
        _id: video._id,
        path: video.path, // Full Cloudinary URL
        label: video.label
      }))
    });
  } catch (error) {
    console.error("Error in createClinic:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update a clinic
export const updateClinic = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      if (req.files) {
        // No local files to delete
      }
      return res.status(400).json({ message: "معرف العيادة غير صالح" });
    }

    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) {
      if (req.files) {
        // No local files to delete
      }
      return res.status(404).json({ message: "العيادة غير موجودة" });
    }

    const { specializationType, availableDays, specialties, videoLabels, email } = req.body;

    if (email && email !== clinic.email) {
      const existingClinic = await Clinic.findOne({ email });
      if (existingClinic) {
        return res.status(400).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
      }
    }

    let videoObjects = clinic.videos;
    if (req.files && req.files.length > 0) {
      const labels = parseJsonField(req.body, 'videoLabels');
      if (labels.length !== req.files.length) {
        return res.status(400).json({ message: "عدد التسميات لا يتطابق مع عدد الفيديوهات المرفوعة" });
      }
      const newVideos = req.files.map((file, index) => ({
        path: file.path, // Cloudinary secure URL
        label: labels[index] || `Video ${index + 1}`
      }));
      videoObjects = [...videoObjects, ...newVideos];
      console.log('Updated videos to Cloudinary:', newVideos.map(v => v.path));
    }

    const parsedSpecialties = specialties ? parseJsonField(req.body, 'specialties') : clinic.specialties;
    const parsedAvailableDays = availableDays ? parseJsonField(req.body, 'availableDays') : clinic.availableDays;
    const parsedSpecialWords = req.body.specialWords ? parseJsonField(req.body, 'specialWords') : clinic.specialWords;

    if (parsedAvailableDays) {
      const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "All"];
      if (!Array.isArray(parsedAvailableDays) || parsedAvailableDays.length === 0) {
        return res.status(400).json({ message: "يجب تحديد يوم واحد على الأقل أو 'All'" });
      }
      if (!parsedAvailableDays.every(day => validDays.includes(day))) {
        return res.status(400).json({ message: "أيام غير صالحة" });
      }
    }

    if (parsedSpecialWords.some(word => typeof word !== 'string' || word.trim().length < 1)) {
      return res.status(400).json({ message: "الكلمات الخاصة يجب أن تكون نصوصًا غير فارغة" });
    }

    const effectiveSpecializationType = specializationType || clinic.specializationType;

    if (effectiveSpecializationType === "specialized" && specialties && (!Array.isArray(parsedSpecialties) || parsedSpecialties.length === 0)) {
      return res.status(400).json({ message: "يجب توفير قائمة التخصصات للعيادة المتخصصة" });
    }

    const updatedClinic = await Clinic.findByIdAndUpdate(
      req.params.id, 
      {
        ...req.body,
        email: email || undefined, 
        specialties: effectiveSpecializationType === "specialized" ? parsedSpecialties : [],
        availableDays: parsedAvailableDays,
        specialWords: parsedSpecialWords,
        videos: videoObjects
      }, 
      { new: true }
    );

    res.json({
      ...updatedClinic.toObject(),
      videos: updatedClinic.videos.map(video => ({
        _id: video._id,
        path: video.path, // Full Cloudinary URL
        label: video.label
      }))
    });
  } catch (error) {
    console.error("Error in updateClinic:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a clinic
export const deleteClinic = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "معرف العيادة غير صالح" });
    }

    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) {
      return res.status(404).json({ message: "العيادة غير موجودة" });
    }

    // Optional: Delete videos from Cloudinary
    if (clinic.videos && clinic.videos.length > 0) {
      for (const video of clinic.videos) {
        if (video.path) {
          const publicId = video.path.split('/').pop().split('.')[0]; // Extract public_id from URL
          await cloudinary.uploader.destroy(publicId, { resource_type: 'video' }).catch(err => console.log('Error deleting video from Cloudinary:', err));
        }
      }
    }

    await Clinic.findByIdAndDelete(req.params.id);
    await Doctor.updateMany({ clinics: req.params.id }, { $pull: { clinics: req.params.id } });
    res.json({ message: "تم حذف العيادة" });
  } catch (error) {
    console.error("Error in deleteClinic:", error);
    res.status(500).json({ message: error.message });
  }
};

// Add doctors to clinic
export const addDoctorsToClinic = async (req, res) => {
  const { id: clinicId } = req.params;
  const { doctorIds } = req.body;

  if (!mongoose.Types.ObjectId.isValid(clinicId)) {
    return res.status(400).json({ message: "معرف العيادة غير صالح" });
  }

  if (!doctorIds || !Array.isArray(doctorIds) || doctorIds.length === 0) {
    return res.status(400).json({ message: "يجب توفير قائمة بمعرفات الأطباء" });
  }

  if (!doctorIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
    return res.status(400).json({ message: "بعض معرفات الأطباء غير صالحة" });
  }

  try {
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ message: "العيادة غير موجودة" });
    }

    const existingDoctors = await Doctor.find({ _id: { $in: doctorIds } });
    if (existingDoctors.length !== doctorIds.length) {
      return res.status(400).json({ message: "بعض الأطباء غير موجودين" });
    }

    const updates = existingDoctors.map(async (doctor) => {
      if (!doctor.clinics) {
        doctor.clinics = [];
      }
      if (!doctor.clinics.includes(clinicId)) {
        doctor.clinics.push(clinicId);
        await doctor.save();
      }
    });

    await Promise.all(updates);

    const updatedDoctors = await Doctor.find({ clinics: clinicId })
      .populate("clinics")
      .populate("schedules.clinic");
    res.json({ 
      ...clinic.toObject(), 
      doctors: updatedDoctors, // Doctors already have Cloudinary image URLs
      videos: clinic.videos.map(video => ({
        _id: video._id,
        path: video.path, // Full Cloudinary URL
        label: video.label
      })),
      message: "تم إضافة الأطباء إلى العيادة بنجاح" 
    });
  } catch (error) {
    console.error("Error in addDoctorsToClinic:", {
      clinicId,
      doctorIds,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: "خطأ داخلي في الخادم", error: error.message });
  }
};

// Delete clinic video
export const deleteClinicVideo = async (req, res) => {
  const { clinicId, videoId } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(clinicId)) {
      return res.status(400).json({ message: "معرف العيادة غير صالح" });
    }
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ message: "معرف الفيديو غير صالح" });
    }

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ message: "العيادة غير موجودة" });
    }

    const videoIndex = clinic.videos.findIndex(video => video._id.toString() === videoId);
    if (videoIndex === -1) {
      return res.status(404).json({ message: "الفيديو غير موجود" });
    }

    const video = clinic.videos[videoIndex];
    // Optional: Delete video from Cloudinary
    if (video.path) {
      const publicId = video.path.split('/').pop().split('.')[0]; // Extract public_id from URL
      await cloudinary.uploader.destroy(publicId, { resource_type: 'video' }).catch(err => console.log('Error deleting video from Cloudinary:', err));
    }

    clinic.videos.splice(videoIndex, 1);
    await clinic.save();

    res.json({
      ...clinic.toObject(),
      videos: clinic.videos.map(video => ({
        _id: video._id,
        path: video.path, // Full Cloudinary URL
        label: video.label
      })),
      message: "تم حذف الفيديو بنجاح"
    });
  } catch (error) {
    console.error("Error in deleteClinicVideo:", {
      clinicId,
      videoId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: "خطأ في حذف الفيديو", error: error.message });
  }
};