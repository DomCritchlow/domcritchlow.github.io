const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Sanitize filename to prevent path traversal attacks
function sanitizeFilename(name) {
  if (!name) return null;
  
  // Remove any path components and dangerous characters
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Ensure it's just a filename, no paths
  const basename = path.basename(cleaned);
  
  // Ensure it has a valid image extension
  const ext = path.extname(basename).toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  
  if (!validExtensions.includes(ext)) {
    return basename + '.jpg';
  }
  
  return basename;
}

async function processPhoto() {
  try {
    // Get data from environment variables
    const imageDataBase64 = process.env.IMAGE_DATA;
    const rawImageName = process.env.IMAGE_NAME;
    
    if (!imageDataBase64) {
      throw new Error('No image data provided');
    }
    
    // Sanitize filename
    const imageName = sanitizeFilename(rawImageName) || `photo-${Date.now()}.jpg`;
    console.log(`Processing image: ${imageName}`);
    
    // Decode base64 image
    const imageBuffer = Buffer.from(imageDataBase64, 'base64');
    
    // Validate size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (imageBuffer.length > maxSize) {
      throw new Error(`Image too large: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB (max 10MB)`);
    }
    
    console.log(`Image size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB`);
    
    // Validate that it's actually an image
    const metadata = await sharp(imageBuffer).metadata();
    const validFormats = ['jpeg', 'png', 'webp'];
    
    if (!validFormats.includes(metadata.format)) {
      throw new Error(`Invalid image format: ${metadata.format}. Allowed: ${validFormats.join(', ')}`);
    }
    
    console.log(`Image format: ${metadata.format}, dimensions: ${metadata.width}x${metadata.height}`);
    
    // Define paths
    const galleryPath = path.join(process.cwd(), 'public', 'gallery', imageName);
    const thumbPath = path.join(process.cwd(), 'public', 'gallery-thumbs', imageName);
    
    // Save original image
    await sharp(imageBuffer)
      .jpeg({ quality: 90 })
      .toFile(galleryPath);
    
    console.log(`✓ Saved original: ${imageName}`);
    
    // Create and save thumbnail (300px max width/height)
    await sharp(imageBuffer)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toFile(thumbPath);
    
    console.log(`✓ Saved thumbnail: ${imageName}`);
    console.log(`✓ Photo will be automatically detected by photos.js`);
    
  } catch (error) {
    console.error('Error processing photo:', error);
    process.exit(1);
  }
}

processPhoto();

