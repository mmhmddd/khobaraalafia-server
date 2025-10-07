// Backend Controller (clinics controller file)

import mongoose from "mongoose";
import Clinic from "../models/Clinic.js";
import Doctor from "../models/Doctor.js";
import { v2 as cloudinary } from 'cloudinary';

const parseJsonField = (body, field) => {
  try {
    const value = body[field];
    if (Array.isArray(value)) {
      return value.map(item => (typeof item === 'object' && item.ar ? item.ar : item));
    }
    if (typeof value === 'string') {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(item => (typeof item === 'object' && item.ar ? item.ar : item)) : [];
    }
    return [];
  } catch (error) {
    console.error(`Error parsing ${field}:`, error, { value: body[field] });
    return [];
  }
};

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
      doctors: doctors,
      videos: clinic.videos.map(video => ({
        _id: video._id,
        path: video.path,
        label: video.label
      }))
    });
  } catch (error) {
    console.error("Error in getClinicById:", error);
    res.status(500).json({ message: error.message });
  }
};

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
    videoLabels,
    isAvailableForBooking
  } = req.body;

  let videoObjects = [];
  if (req.files && req.files.length > 0) {
    const labels = parseJsonField(req.body, 'videoLabels');
    if (labels.length !== req.files.length) {
      return res.status(400).json({ message: "عدد التسميات لا يتطابق مع عدد الفيديوهات المرفوعة" });
    }
    videoObjects = req.files.map((file, index) => ({
      path: file.path,
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

    if (!name || !phone || !specializationType || !status || !availableDays || !about || isAvailableForBooking === undefined) {
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
      videos: videoObjects,
      isAvailableForBooking: isAvailableForBooking === 'true' || isAvailableForBooking === true
    });
    await clinic.save();

    res.status(201).json({
      ...clinic.toObject(),
      videos: clinic.videos.map(video => ({
        _id: video._id,
        path: video.path,
        label: video.label
      }))
    });
  } catch (error) {
    console.error("Error in createClinic:", error);
    res.status(500).json({ message: error.message });
  }
};

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

    const { specializationType, availableDays, specialties, videoLabels, email, isAvailableForBooking } = req.body;

    console.log('Request body:', req.body);
    console.log('Raw specialties:', req.body.specialties);
    const parsedSpecialties = req.body.specialties ? parseJsonField(req.body, 'specialties') : clinic.specialties;
    console.log('Parsed specialties:', parsedSpecialties);

    if (email && email !== clinic.email) {
      const existingClinic = await Clinic.findOne({ email });
      if (existingClinic) {
        return res.status(400).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
      }
    }

    let videoObjects = clinic.videos;

    // Handle existing videos (deletions and label updates)
    const parsedExistingVideos = parseJsonField(req.body, 'existingVideos');
    if (Array.isArray(parsedExistingVideos)) {
      // Find videos to delete (present in DB but not in sent existingVideos)
      const toDelete = videoObjects.filter(v => !parsedExistingVideos.some(ev => ev._id === v._id.toString()));
      for (const vid of toDelete) {
        if (vid.path) {
          const publicId = vid.path.split('/').pop()?.split('.')[0];
          if (publicId) {
            try {
              await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
              console.log(`Deleted video ${vid._id} from Cloudinary`);
            } catch (err) {
              console.error(`Error deleting video ${vid._id}:`, err);
            }
          }
        }
      }

      // Filter to remaining videos
      videoObjects = videoObjects.filter(v => parsedExistingVideos.some(ev => ev._id === v._id.toString()));

      // Update labels
      for (const ev of parsedExistingVideos) {
        const vid = videoObjects.find(v => v._id.toString() === ev._id);
        if (vid && ev.label) {
          vid.label = ev.label;
        }
      }
    }

    // Append new videos
    if (req.files && req.files.length > 0) {
      const labels = parseJsonField(req.body, 'videoLabels');
      if (labels.length !== req.files.length) {
        return res.status(400).json({ message: "عدد التسميات لا يتطابق مع عدد الفيديوهات المرفوعة" });
      }
      const newVideos = req.files.map((file, index) => ({
        path: file.path,
        label: labels[index] || `Video ${index + 1}`
      }));
      videoObjects = [...videoObjects, ...newVideos];
      console.log('Updated videos to Cloudinary:', newVideos.map(v => v.path));
    }

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
        videos: videoObjects,
        isAvailableForBooking: isAvailableForBooking !== undefined ? (isAvailableForBooking === 'true' || isAvailableForBooking === true) : clinic.isAvailableForBooking
      }, 
      { new: true }
    );

    res.json({
      ...updatedClinic.toObject(),
      videos: updatedClinic.videos.map(video => ({
        _id: video._id,
        path: video.path,
        label: video.label
      }))
    });
  } catch (error) {
    console.error("Error in updateClinic:", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteClinic = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "معرف العيادة غير صالح" });
    }

    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) {
      return res.status(404).json({ message: "العيادة غير موجودة" });
    }

    if (clinic.videos && clinic.videos.length > 0) {
      for (const video of clinic.videos) {
        if (video.path) {
          const publicId = video.path.split('/').pop().split('.')[0];
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
      doctors: updatedDoctors,
      videos: clinic.videos.map(video => ({
        _id: video._id,
        path: video.path,
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
    if (video.path) {
      const publicId = video.path.split('/').pop()?.split('.')[0];
      if (publicId) {
        try {
          const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
          console.log(`Cloudinary deletion result for video ${videoId}:`, result);
        } catch (err) {
          console.error(`Error deleting video ${videoId} from Cloudinary:`, err);
        }
      } else {
        console.warn(`No valid publicId for video ${videoId} at path: ${video.path}`);
      }
    } else {
      console.warn(`No path found for video ${videoId}`);
    }

    clinic.videos.splice(videoIndex, 1);
    const updatedClinic = await clinic.save();
    console.log(`Clinic ${clinicId} saved after video ${videoId} deletion. Updated videos:`, updatedClinic.videos);

    res.json({
      ...updatedClinic.toObject(),
      videos: updatedClinic.videos.map(video => ({
        _id: video._id,
        path: video.path,
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