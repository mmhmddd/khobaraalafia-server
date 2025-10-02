import mongoose from "mongoose";
import Clinic from "../models/Clinic.js";
import Doctor from "../models/Doctor.js";
import fs from 'fs';
import path from 'path';

const parseJsonField = (body, field) => {
  try {
    const value = body[field];
    return value ? JSON.parse(value) : [];
  } catch (error) {
    console.error(`Error parsing ${field}:`, error);
    return [];
  }
};

const getImageUrl = (imagePath, baseUrl) => {
  if (!imagePath) return null;
  const fullPath = path.join(process.cwd(), imagePath.replace(/^\//, ''));
  return fs.existsSync(fullPath) ? `${baseUrl}${imagePath}` : null;
};

export const getClinics = async (req, res) => {
  try {
    const clinics = await Clinic.find({});
    const baseUrl = res.locals.baseUrl;
    const clinicsWithDoctors = await Promise.all(
      clinics.map(async (clinic) => {
        const doctors = await Doctor.find({ clinics: clinic._id })
          .populate("clinics")
          .populate("schedules.clinic");
        const doctorsWithImage = doctors.map(doctor => ({
          ...doctor.toObject(),
          image: getImageUrl(doctor.image, baseUrl),
        }));
        return { 
          ...clinic.toObject(), 
          doctors: doctorsWithImage,
          videos: clinic.videos.map(video => ({
            _id: video._id,
            path: video.path ? `${baseUrl}${video.path}` : null,
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
    const baseUrl = res.locals.baseUrl;
    const doctorsWithImage = doctors.map(doctor => ({
      ...doctor.toObject(),
      image: getImageUrl(doctor.image, baseUrl),
    }));
    res.json({ 
      ...clinic.toObject(), 
      doctors: doctorsWithImage,
      videos: clinic.videos.map(video => ({
        _id: video._id,
        path: video.path ? `${baseUrl}${video.path}` : null,
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
    videoLabels
  } = req.body;

  let videoObjects = [];
  if (req.files && req.files.length > 0) {
    const labels = parseJsonField(req.body, 'videoLabels');
    if (labels.length !== req.files.length) {
      req.files.forEach(file => {
        fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
      });
      return res.status(400).json({ message: "عدد التسميات لا يتطابق مع عدد الفيديوهات المرفوعة" });
    }
    videoObjects = req.files.map((file, index) => ({
      path: `/videos/${file.filename}`,
      label: labels[index] || `Video ${index + 1}`
    }));
  }

  try {
    if (email) {
      const clinic = await Clinic.findOne({ email });
      if (clinic) {
        if (req.files) {
          req.files.forEach(file => {
            fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
          });
        }
        return res.status(400).json({ message: "العيادة موجودة بالفعل" });
      }
    }

    if (!name || !phone || !specializationType || !status || !availableDays || !about) {
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
        });
      }
      return res.status(400).json({ message: "الحقول المطلوبة مفقودة" });
    }

    const parsedSpecialties = parseJsonField(req.body, 'specialties');
    const parsedAvailableDays = parseJsonField(req.body, 'availableDays');
    const parsedSpecialWords = parseJsonField(req.body, 'specialWords');

    const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "All"];
    if (!parsedAvailableDays || !Array.isArray(parsedAvailableDays) || parsedAvailableDays.length === 0) {
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
        });
      }
      return res.status(400).json({ message: "يجب تحديد يوم واحد على الأقل أو 'All'" });
    }
    if (!parsedAvailableDays.every(day => validDays.includes(day))) {
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
        });
      }
      return res.status(400).json({ message: "أيام غير صالحة" });
    }

    if (specializationType === "specialized" && (!parsedSpecialties || !Array.isArray(parsedSpecialties) || parsedSpecialties.length === 0)) {
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
        });
      }
      return res.status(400).json({ message: "يجب توفير قائمة التخصصات للعيادة المتخصصة" });
    }

    if (parsedSpecialWords.some(word => typeof word !== 'string' || word.trim().length < 1)) {
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
        });
      }
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

    const baseUrl = res.locals.baseUrl;
    res.status(201).json({
      ...clinic.toObject(),
      videos: clinic.videos.map(video => ({
        _id: video._id,
        path: video.path ? `${baseUrl}${video.path}` : null,
        label: video.label
      }))
    });
  } catch (error) {
    if (req.files) {
      req.files.forEach(file => {
        fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
      });
    }
    console.error("Error in createClinic:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update a clinic
export const updateClinic = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
        });
      }
      return res.status(400).json({ message: "معرف العيادة غير صالح" });
    }

    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) {
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
        });
      }
      return res.status(404).json({ message: "العيادة غير موجودة" });
    }

    const { specializationType, availableDays, specialties, videoLabels, email } = req.body;

    if (email && email !== clinic.email) {
      const existingClinic = await Clinic.findOne({ email });
      if (existingClinic) {
        if (req.files) {
          req.files.forEach(file => {
            fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
          });
        }
        return res.status(400).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
      }
    }

    let videoObjects = clinic.videos;
    if (req.files && req.files.length > 0) {
      const labels = parseJsonField(req.body, 'videoLabels');
      if (labels.length !== req.files.length) {
        req.files.forEach(file => {
          fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
        });
        return res.status(400).json({ message: "عدد التسميات لا يتطابق مع عدد الفيديوهات المرفوعة" });
      }
      const newVideos = req.files.map((file, index) => ({
        path: `/videos/${file.filename}`,
        label: labels[index] || `Video ${index + 1}`
      }));
      videoObjects = [...videoObjects, ...newVideos];
    }

    const parsedSpecialties = specialties ? parseJsonField(req.body, 'specialties') : clinic.specialties;
    const parsedAvailableDays = availableDays ? parseJsonField(req.body, 'availableDays') : clinic.availableDays;
    const parsedSpecialWords = req.body.specialWords ? parseJsonField(req.body, 'specialWords') : clinic.specialWords;

    if (parsedAvailableDays) {
      const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "All"];
      if (!Array.isArray(parsedAvailableDays) || parsedAvailableDays.length === 0) {
        if (req.files) {
          req.files.forEach(file => {
            fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
          });
        }
        return res.status(400).json({ message: "يجب تحديد يوم واحد على الأقل أو 'All'" });
      }
      if (!parsedAvailableDays.every(day => validDays.includes(day))) {
        if (req.files) {
          req.files.forEach(file => {
            fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
          });
        }
        return res.status(400).json({ message: "أيام غير صالحة" });
      }
    }

    if (parsedSpecialWords.some(word => typeof word !== 'string' || word.trim().length < 1)) {
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
        });
      }
      return res.status(400).json({ message: "الكلمات الخاصة يجب أن تكون نصوصًا غير فارغة" });
    }

    const effectiveSpecializationType = specializationType || clinic.specializationType;

    if (effectiveSpecializationType === "specialized" && specialties && (!Array.isArray(parsedSpecialties) || parsedSpecialties.length === 0)) {
      if (req.files) {
        req.files.forEach(file => {
          fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
        });
      }
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

    const baseUrl = res.locals.baseUrl;
    res.json({
      ...updatedClinic.toObject(),
      videos: updatedClinic.videos.map(video => ({
        _id: video._id,
        path: video.path ? `${baseUrl}${video.path}` : null,
        label: video.label
      }))
    });
  } catch (error) {
    if (req.files) {
      req.files.forEach(file => {
        fs.unlinkSync(path.join(process.cwd(), 'videos', file.filename));
      });
    }
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
      clinic.videos.forEach(video => {
        const videoPath = path.join(process.cwd(), video.path.replace(/^\//, ''));
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }
      });
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
    const baseUrl = res.locals.baseUrl;
    const doctorsWithImage = updatedDoctors.map(doctor => ({
      ...doctor.toObject(),
      image: getImageUrl(doctor.image, baseUrl),
    }));
    res.json({ 
      ...clinic.toObject(), 
      doctors: doctorsWithImage,
      videos: clinic.videos.map(video => ({
        _id: video._id,
        path: video.path ? `${baseUrl}${video.path}` : null,
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
      const videoPath = path.join(process.cwd(), video.path.replace(/^\//, ''));
      try {
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
          console.log(`Deleted video file: ${videoPath}`);
        } else {
          console.warn(`Video file not found: ${videoPath}`);
        }
      } catch (fileError) {
        console.error(`Failed to delete video file ${videoPath}:`, fileError);
      }
    } else {
      console.warn(`No video path provided for video ID: ${videoId}`);
    }

    clinic.videos.splice(videoIndex, 1);
    await clinic.save();

    const baseUrl = res.locals.baseUrl;
    res.json({
      ...clinic.toObject(),
      videos: clinic.videos.map(video => ({
        _id: video._id,
        path: video.path ? `${baseUrl}${video.path}` : null,
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