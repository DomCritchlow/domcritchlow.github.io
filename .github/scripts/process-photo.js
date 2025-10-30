const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function processPhoto() {
  try {
    // Get data from environment variables
    const imageDataBase64 = process.env.IMAGE_DATA;
    const imageName = process.env.IMAGE_NAME || `photo-${Date.now()}.jpg`;
    
    if (!imageDataBase64) {
      throw new Error('No image data provided');
    }
    
    // Decode base64 image
    const imageBuffer = Buffer.from(imageDataBase64, 'base64');
    
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

