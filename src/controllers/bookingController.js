import Booking from "../models/Booking.js";
import Clinic from "../models/Clinic.js";
import User from "../models/User.js";
import dayjs from 'dayjs';

// Create a new booking
export const createBooking = async (req, res) => {
  const { clientName, clientPhone, clinicId, date, time } = req.body;
  const user = req.user; // May be undefined for unauthenticated users
  try {
    // Validate required fields
    if (!clinicId || !date || !time || !clientName || !clientPhone) {
      return res.status(400).json({ message: "جميع الحقول مطلوبة" });
    }

    // Find the clinic
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) return res.status(404).json({ message: "العيادة غير موجودة" });

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      return res.status(400).json({ message: "تنسيق الوقت غير صالح" });
    }

    // Normalize the date (remove time portion)
    const normalizedDate = dayjs(date).startOf('day').toDate();

    // Generate booking number
    const count = await Booking.countDocuments({ clinic: clinicId, date: normalizedDate });
    const bookingNumber = count + 1;

    // Generate confirmation code
    const confirmationCode = Math.floor(10000 + Math.random() * 90000).toString();

    // Create the booking
    const booking = new Booking({
      user: user?._id || null, // Store user ID if authenticated, otherwise null
      clinic: clinicId,
      date: normalizedDate,
      time,
      clientName,
      clientPhone,
      bookingNumber,
      confirmationCode,
      status: "pending",
    });
    await booking.save();

    // If user is authenticated, update their reservations
    if (user) {
      await User.findByIdAndUpdate(user._id, {
        $push: {
          reservations: {
            clinicName: clinic.name,
            date: normalizedDate,
            time,
            status: booking.status,
          },
        },
      });
    }

    // Increment total bookings in clinic
    await Clinic.findByIdAndUpdate(clinicId, { $inc: { totalBookings: 1 } });

    // Populate clinic details for response
    const populatedBooking = await Booking.findById(booking._id).populate("clinic");

    // Return booking details
    res.status(201).json({
      message: "تم إنشاء الحجز بنجاح",
      booking: {
        _id: populatedBooking._id,
        clinicName: populatedBooking.clinic.name,
        date: populatedBooking.date,
        time: populatedBooking.time,
        clientName: populatedBooking.clientName,
        clientPhone: populatedBooking.clientPhone,
        status: populatedBooking.status,
        bookingNumber: populatedBooking.bookingNumber,
        confirmationCode: populatedBooking.confirmationCode,
        createdAt: populatedBooking.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
};

// Get valid dates for bookings
export const getValidDates = async (req, res) => {
  try {
    const validDates = await Booking.find({}).distinct('date');
    res.json(validDates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
};

// Get my bookings
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).populate("clinic");
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
};

// Cancel a booking
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "الحجز غير موجود" });

    if (booking.user && booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "غير مصرح" });
    }

    booking.status = "cancelled";
    await booking.save();

    if (booking.user) {
      await User.updateOne(
        { _id: req.user._id, "reservations.date": booking.date, "reservations.time": booking.time },
        { $set: { "reservations.$.status": "cancelled" } }
      );
    }

    res.json({ message: "تم إلغاء الحجز" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
};

// Delete a booking
export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "الحجز غير موجود" });

    // Check if the user is authorized to delete the booking
    if (booking.user && booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "غير مصرح" });
    }

    // Remove the booking from the database
    await Booking.deleteOne({ _id: req.params.id });

    // If user is authenticated, remove the reservation from their reservations array
    if (booking.user) {
      await User.updateOne(
        { _id: req.user._id },
        { $pull: { reservations: { date: booking.date, time: booking.time } } }
      );
    }

    // Decrement total bookings in clinic
    await Clinic.findByIdAndUpdate(booking.clinic, { $inc: { totalBookings: -1 } });

    res.json({ message: "تم حذف الحجز بنجاح" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
};

// Get all bookings (admin only)
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({}).populate("user clinic");
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
};