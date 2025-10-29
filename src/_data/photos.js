const fs = require('fs');
const path = require('path');

module.exports = function() {
  const photosDir = path.join(__dirname, '../../public/gallery');
  
  try {
    // Read all files from the photos directory
    const files = fs.readdirSync(photosDir);
    
    // Filter for image files only (jpg, jpeg, png, gif, webp)
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });
    
    // Sort alphabetically
    return imageFiles.sort();
    
  } catch (error) {
    console.error('Error reading photos directory:', error);
    return [];
  }
};

