import mongoose from 'mongoose';

const cursorImageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true, 
    },
    description: {
      type: String,
      trim: true, 
    },
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required'],
    },
    publicId: {
      type: String,
      required: [true, 'Cloudinary public ID is required'],
    },
    order: {
      type: Number,
      required: [true, 'Order is required'],
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('CursorImage', cursorImageSchema);