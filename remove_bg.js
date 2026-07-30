import { Jimp } from 'jimp';

async function removeWhiteBackground(imagePath, outputPath) {
  try {
    const image = await Jimp.read(imagePath);
    
    // Scan all pixels
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      
      // If the pixel is pure white or very close to white, make it transparent
      if (red > 240 && green > 240 && blue > 240) {
        this.bitmap.data[idx + 3] = 0; // alpha to 0
      }
    });

    await image.write(outputPath);
    console.log('Background removed successfully.');
  } catch (err) {
    console.error('Error processing image:', err);
  }
}

removeWhiteBackground('public/logo.png', 'public/logo_transparent.png');
