import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import CursorImage from '../models/CursorImage.js';

// Multer setup: Use memory storage to handle file buffers
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder = 'hero-cursor') => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { 
        folder,
        resource_type: 'image',
        transformation: [{ quality: 'auto' }, { fetch_format: 'auto' }]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(buffer);
  });
};

// CREATE: Upload new image
export const createCursorImage = [
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' });
      }
      if (!req.body.order && req.body.order !== '0') {
        return res.status(400).json({ error: 'Order is required' });
      }

      const result = await uploadToCloudinary(req.file.buffer);
      
      const newImage = new CursorImage({
        title: req.body.title || '', // Optional, default empty
        description: req.body.description || '', // Optional, default empty
        imageUrl: result.secure_url,
        publicId: result.public_id,
        order: parseInt(req.body.order),
      });

      const savedImage = await newImage.save();
      res.status(201).json(savedImage);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message });
    }
  }
];

// READ: Get all active images (sorted by order)
export const getAllCursorImages = async (req, res) => {
  try {
    const images = await CursorImage.find({ isActive: true })
      .sort({ order: 1 })
      .select('-__v');
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// READ: Get single image by ID
export const getCursorImageById = async (req, res) => {
  try {
    const image = await CursorImage.findById(req.params.id).select('-__v');
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.json(image);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// UPDATE: Edit image (optional new image upload)
export const updateCursorImage = [
  upload.single('image'),
  async (req, res) => {
    try {
      const image = await CursorImage.findById(req.params.id);
      if (!image) {
        return res.status(404).json({ error: 'Image not found' });
      }

      // If new image provided, delete old and upload new
      if (req.file) {
        await cloudinary.uploader.destroy(image.publicId);
        const result = await uploadToCloudinary(req.file.buffer);
        image.imageUrl = result.secure_url;
        image.publicId = result.public_id;
      }

      // Update fields if provided, otherwise keep existing
      image.title = req.body.title !== undefined ? req.body.title : image.title;
      image.description = req.body.description !== undefined ? req.body.description : image.description;
      image.order = req.body.order !== undefined ? parseInt(req.body.order) : image.order;
      image.isActive = req.body.isActive !== undefined ? req.body.isActive === 'true' : image.isActive;

      const updatedImage = await image.save();
      res.json(updatedImage);
    } catch (error) {
      console.error('Update error:', error);
      res.status(500).json({ error: error.message });
    }
  }
];

// DELETE: Delete image (also from Cloudinary)
export const deleteCursorImage = async (req, res) => {
  try {
    const image = await CursorImage.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    await cloudinary.uploader.destroy(image.publicId);
    await image.deleteOne();
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
};