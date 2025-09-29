import { Router } from 'express';
import { ImageController } from '../controllers/imageController';
import { upload, handleUploadError } from '../middleware/upload';
import { validateParams, validateQuery, validateBody, UUIDSchema, ImageFiltersSchema, validateImageMetadata } from '../middleware/validation';
import { UpdateImageSchema } from '../models/Image';

const router = Router();
const imageController = new ImageController();

// Upload single image
router.post(
  '/upload',
  upload.single('image'),
  handleUploadError,
  validateImageMetadata,
  imageController.uploadImage
);

// Get all images with pagination and filters
router.get(
  '/',
  validateQuery(ImageFiltersSchema),
  imageController.getImages
);

// Get image statistics
router.get('/stats', imageController.getImageStats);

// Get single image by ID
router.get(
  '/:id',
  validateParams(UUIDSchema),
  imageController.getImageById
);

// Get image file
router.get(
  '/:id/file',
  validateParams(UUIDSchema),
  imageController.getImageFile
);

// Update image metadata
router.put(
  '/:id',
  validateParams(UUIDSchema),
  validateBody(UpdateImageSchema),
  imageController.updateImage
);

// Delete image
router.delete(
  '/:id',
  validateParams(UUIDSchema),
  imageController.deleteImage
);

export default router;