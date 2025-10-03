// doctorController.js
import Doctor from "../models/Doctor.js";
import Clinic from "../models/Clinic.js";
import { v2 as cloudinary } from 'cloudinary'; // Add for optional delete

// Helper to safely parse JSON fields from req.body
const parseJsonField = (body, field) => {
  try {
    const value = body[field];
    return value ? JSON.parse(value) : [];
  } catch (error) {
    console.error(`Error parsing ${field}:`, error);
    return [];
  }
};

// Get all doctors (image is now full Cloudinary URL, no helper needed)
export const getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({}).populate("clinics");
    res.json(doctors); // Return as is – image is full URL
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get one doctor by ID
export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate("clinics");
    if (!doctor) {
      return res.status(404).json({ message: "الطبيب غير موجود" });
    }
    res.json(doctor); // Return as is – image is full URL
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new doctor
export const createDoctor = async (req, res) => {
  // Parse JSON fields from FormData
  const parsedBody = {
    ...req.body,
    specialties: parseJsonField(req.body, 'specialties'), // Expect [{ar, en}]
    clinics: parseJsonField(req.body, 'clinics'),
    schedules: parseJsonField(req.body, 'schedules'),
    specialWords: parseJsonField(req.body, 'specialWords') // Expect [{ar, en}]
  };

  const { 
    name_ar, name_en, 
    email, phone, 
    address_ar, address_en, 
    specialization_ar, specialization_en, 
    specialties, clinics, status_ar, status_en, schedules, yearsOfExperience, 
    about_ar, about_en, specialWords 
  } = parsedBody;

  let imagePath = ''; // Default empty image path
  if (req.file) {
    imagePath = req.file.path; // Cloudinary secure URL
    console.log(`Uploaded image to Cloudinary: ${imagePath}`);
  }

  try {
    // Declare doctor variable outside the scope to avoid ReferenceError
    let doctor;

    if (email) {
      doctor = await Doctor.findOne({ email });
      if (doctor) return res.status(400).json({ message: "الطبيب موجود بالفعل" });
    }

    if (!["طب عام", "طب تخصصي"].includes(specialization_ar)) {
      return res.status(400).json({ message: "التخصص العربي غير صالح، يجب أن يكون 'طب عام' أو 'طب تخصصي'" });
    }

    // Set default en for specialization if not provided
    const effectiveSpecializationEn = specialization_en || (specialization_ar === "طب عام" ? "General Medicine" : "Specialized Medicine");

    // Validate en if provided (or defaulted, but default is always valid)
    if (!["General Medicine", "Specialized Medicine"].includes(effectiveSpecializationEn)) {
      return res.status(400).json({ message: "التخصص الإنجليزي غير صالح" });
    }

    if (!clinics || clinics.length === 0) {
      return res.status(400).json({ message: "يجب توفير عيادة واحدة على الأقل" });
    }
    const existingClinics = await Clinic.find({ _id: { $in: clinics } });
    if (existingClinics.length !== clinics.length) {
      return res.status(400).json({ message: "بعض العيادات غير موجودة" });
    }

    if (!Number.isInteger(Number(yearsOfExperience)) || Number(yearsOfExperience) < 0) {
      return res.status(400).json({ message: "سنوات الخبرة يجب أن تكون عددًا صحيحًا غير سالب" });
    }

    // Format and validate schedules (no change, as not bilingual)
    let formattedSchedules = schedules || [];
    if (formattedSchedules.length > 0) {
      const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "All"];
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      formattedSchedules = formattedSchedules.map(schedule => {
        const days = schedule.days.includes("All") 
          ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
          : schedule.days;
          
        return {
          days: days,
          clinic: schedule.clinic || undefined,
          startTime: schedule.startTime || undefined,
          endTime: schedule.endTime || undefined
        };
      });

      if (specialization_ar === "طب تخصصي") {
        for (const schedule of formattedSchedules) {
          if (!schedule.clinic || !clinics.includes(schedule.clinic.toString())) {
            return res.status(400).json({ message: "معرف العيادة في الجدول غير صالح أو غير مرتبط" });
          }
          const clinic = existingClinics.find(c => c._id.toString() === schedule.clinic.toString());
          if (!clinic.availableDays.includes("All") && !schedule.days.every(day => clinic.availableDays.includes(day))) {
            return res.status(400).json({ message: "أيام الجدول غير متوافقة مع أيام العيادة" });
          }
          if (!schedule.days || !schedule.days.length || !schedule.days.every(day => validDays.includes(day) || day === "All")) {
            return res.status(400).json({ message: "أيام الجدول غير صالحة" });
          }
          if (!schedule.startTime || !schedule.endTime || !timeRegex.test(schedule.startTime) || !timeRegex.test(schedule.endTime)) {
            return res.status(400).json({ message: "تنسيق وقت البداية أو النهاية غير صالح" });
          }
        }
      } else {
        for (const schedule of formattedSchedules) {
          if (!schedule.days || !schedule.days.length || !schedule.days.every(day => validDays.includes(day) || day === "All")) {
            return res.status(400).json({ message: "أيام الجدول غير صالحة" });
          }
        }
      }
    }

    if (specialization_ar === "طب تخصصي" && (!specialties || !Array.isArray(specialties) || specialties.length === 0 || specialties.some(s => !s.ar))) {
      return res.status(400).json({ message: "يجب توفير قائمة التخصصات العربية لطب تخصصي" });
    }

    if (!specialWords || !Array.isArray(specialWords) || specialWords.length === 0 || specialWords.some(w => !w.ar)) {
      return res.status(400).json({ message: "يجب توفير كلمات خاصة عربية واحدة على الأقل" });
    }

    // Set status en to match ar if not provided
    const effectiveStatusEn = status_en || (status_ar === "متاح" ? "Available" : "Unavailable");

    doctor = new Doctor({
      name: { ar: name_ar, en: name_en },
      email,
      phone,
      address: { ar: address_ar, en: address_en },
      specialization: { ar: specialization_ar, en: effectiveSpecializationEn },
      specialties: specialization_ar === "طب تخصصي" ? specialties : [],
      clinics,
      status: { ar: status_ar || "متاح", en: effectiveStatusEn },
      image: imagePath,
      schedules: formattedSchedules,
      yearsOfExperience: Number(yearsOfExperience),
      about: { ar: about_ar, en: about_en },
      specialWords
    });
    await doctor.save();

    res.status(201).json(doctor);
  } catch (error) {
    console.error("Error in createDoctor:", error);
    res.status(500).json({ message: `خطأ في الخادم: ${error.message}` });
  }
};

// Update a doctor
export const updateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: "الطبيب غير موجود" });
    }

    // Parse JSON fields from FormData
    const parsedBody = {
      ...req.body,
      specialties: parseJsonField(req.body, 'specialties'),
      clinics: parseJsonField(req.body, 'clinics'),
      schedules: parseJsonField(req.body, 'schedules'),
      specialWords: parseJsonField(req.body, 'specialWords')
    };

    const { 
      name_ar, name_en, 
      email, phone, 
      address_ar, address_en, 
      specialization_ar, specialization_en, 
      specialties, clinics, status_ar, status_en, schedules, yearsOfExperience, 
      about_ar, about_en, specialWords 
    } = parsedBody;

    if (email) {
      const existingDoctor = await Doctor.findOne({ email });
      if (existingDoctor && existingDoctor._id.toString() !== req.params.id) {
        return res.status(400).json({ message: "الإيميل مستخدم بالفعل" });
      }
    }

    let imagePath = doctor.image;

    if (req.file) {
      // Optional: Delete old image from Cloudinary
      if (doctor.image) {
        const publicId = doctor.image.split('/').pop().split('.')[0]; // Extract public_id
        await cloudinary.uploader.destroy(publicId).catch(err => console.log('Error deleting old image:', err));
      }
      imagePath = req.file.path; // New Cloudinary URL
      console.log(`Updated image to Cloudinary: ${imagePath}`);
    }

    const effectiveSpecializationAr = specialization_ar || doctor.specialization.ar;
    const effectiveSpecializationEn = specialization_en || (effectiveSpecializationAr === "طب عام" ? "General Medicine" : "Specialized Medicine");

    if (specialization_ar && !["طب عام", "طب تخصصي"].includes(specialization_ar)) {
      return res.status(400).json({ message: "التخصص العربي غير صالح" });
    }

    if (!["General Medicine", "Specialized Medicine"].includes(effectiveSpecializationEn)) {
      return res.status(400).json({ message: "التخصص الإنجليزي غير صالح" });
    }

    if (clinics !== undefined) {
      if (clinics.length === 0) {
        return res.status(400).json({ message: "يجب توفير عيادة واحدة على الأقل" });
      }
      const existingClinics = await Clinic.find({ _id: { $in: clinics } });
      if (existingClinics.length !== clinics.length) {
        return res.status(400).json({ message: "بعض العيادات غير موجودة" });
      }
    }

    if (yearsOfExperience !== undefined && (!Number.isInteger(Number(yearsOfExperience)) || Number(yearsOfExperience) < 0)) {
      return res.status(400).json({ message: "سنوات الخبرة يجب أن تكون عددًا صحيحًا غير سالب" });
    }

    // Format and validate schedules
    let formattedSchedules = schedules !== undefined ? schedules : doctor.schedules;
    if (schedules && schedules.length > 0) {
      const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "All"];
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      formattedSchedules = schedules.map(schedule => {
        const days = schedule.days.includes("All") 
          ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
          : schedule.days;
          
        return {
          days: days,
          clinic: schedule.clinic || undefined,
          startTime: schedule.startTime || undefined,
          endTime: schedule.endTime || undefined
        };
      });

      const effectiveClinics = clinics || doctor.clinics;
      const existingClinics = await Clinic.find({ _id: { $in: effectiveClinics } });
      if (effectiveSpecializationAr === "طب تخصصي") {
        for (const schedule of formattedSchedules) {
          if (!schedule.clinic || !effectiveClinics.includes(schedule.clinic.toString())) {
            return res.status(400).json({ message: "معرف العيادة في الجدول غير صالح أو غير مرتبط" });
          }
          const clinic = existingClinics.find(c => c._id.toString() === schedule.clinic.toString());
          if (!clinic.availableDays.includes("All") && !schedule.days.every(day => clinic.availableDays.includes(day))) {
            return res.status(400).json({ message: "أيام الجدول غير متوافقة مع أيام العيادة" });
          }
          if (!schedule.days || !schedule.days.length || !schedule.days.every(day => validDays.includes(day) || day === "All")) {
            return res.status(400).json({ message: "أيام الجدول غير صالحة" });
          }
          if (!schedule.startTime || !schedule.endTime || !timeRegex.test(schedule.startTime) || !timeRegex.test(schedule.endTime)) {
            return res.status(400).json({ message: "تنسيق وقت البداية أو النهاية غير صالح" });
          }
        }
      } else {
        for (const schedule of formattedSchedules) {
          if (!schedule.days || !schedule.days.length || !schedule.days.every(day => validDays.includes(day) || day === "All")) {
            return res.status(400).json({ message: "أيام الجدول غير صالحة" });
          }
        }
      }
    }

    if (effectiveSpecializationAr === "طب تخصصي" && specialties !== undefined && (!Array.isArray(specialties) || specialties.length === 0 || specialties.some(s => !s.ar))) {
      return res.status(400).json({ message: "يجب توفير قائمة التخصصات العربية لطب تخصصي" });
    }

    if (specialWords !== undefined && (!Array.isArray(specialWords) || specialWords.length === 0 || specialWords.some(w => !w.ar))) {
      return res.status(400).json({ message: "يجب توفير كلمات خاصة عربية واحدة على الأقل" });
    }

    // Set status en to match ar if not provided
    const effectiveStatusAr = status_ar !== undefined ? status_ar : doctor.status.ar;
    const effectiveStatusEn = status_en !== undefined ? status_en : (effectiveStatusAr === "متاح" ? "Available" : "Unavailable");

    const updatedDoctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      {
        name: { ar: name_ar !== undefined ? name_ar : doctor.name.ar, en: name_en !== undefined ? name_en : doctor.name.en },
        email: email !== undefined ? email : doctor.email,
        phone: phone !== undefined ? phone : doctor.phone,
        address: { ar: address_ar !== undefined ? address_ar : doctor.address.ar, en: address_en !== undefined ? address_en : doctor.address.en },
        specialization: { ar: effectiveSpecializationAr, en: effectiveSpecializationEn },
        specialties: effectiveSpecializationAr === "طب تخصصي" ? (specialties !== undefined ? specialties : doctor.specialties) : [],
        clinics: clinics !== undefined ? clinics : doctor.clinics,
        status: { ar: effectiveStatusAr, en: effectiveStatusEn },
        image: imagePath,
        schedules: formattedSchedules,
        yearsOfExperience: yearsOfExperience !== undefined ? Number(yearsOfExperience) : doctor.yearsOfExperience,
        about: { ar: about_ar !== undefined ? about_ar : doctor.about.ar, en: about_en !== undefined ? about_en : doctor.about.en },
        specialWords: specialWords !== undefined ? specialWords : doctor.specialWords
      },
      { new: true }
    ).populate("clinics");
    res.json(updatedDoctor);
  } catch (error) {
    console.error("Error in updateDoctor:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a doctor
export const deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: "الطبيب غير موجود" });
    }

    // Optional: Delete image from Cloudinary
    if (doctor.image) {
      const publicId = doctor.image.split('/').pop().split('.')[0]; // Extract public_id from URL
      await cloudinary.uploader.destroy(publicId).catch(err => console.log('Error deleting image from Cloudinary:', err));
    }

    await Doctor.findByIdAndDelete(req.params.id);
    res.json({ message: "تم حذف الطبيب" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};