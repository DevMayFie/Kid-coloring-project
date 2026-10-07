/**
 * High-performance client-side photo to coloring book line-art converter
 * Converts photos of kids, pets, or toys into thick-line cartoon coloring art
 */

export interface LineArtFilterOptions {
  strokeThickness?: 'bold' | 'extra-bold' | 'delicate';
  edgeThreshold?: number; // 20 - 70
  contrastBoost?: number; // 1.0 - 2.0
}

export async function convertPhotoToLineArt(
  imageSource: string | HTMLImageElement,
  options: LineArtFilterOptions = {}
): Promise<string> {
  const { strokeThickness = 'bold', edgeThreshold = 42, contrastBoost = 1.3 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const width = 800;
        const height = Math.round((img.height / img.width) * 800);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');

        // Draw original scaled image
        ctx.drawImage(img, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // 1. Convert to grayscale with contrast stretching
        const gray = new Float32Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          let val = 0.299 * r + 0.587 * g + 0.114 * b;
          val = ((val - 128) * contrastBoost) + 128;
          gray[i / 4] = Math.max(0, Math.min(255, val));
        }

        // 2. Sobel Edge Detection
        const edges = new Uint8ClampedArray(width * height);
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;

            const p00 = gray[(y - 1) * width + (x - 1)];
            const p01 = gray[(y - 1) * width + x];
            const p02 = gray[(y - 1) * width + (x + 1)];

            const p10 = gray[y * width + (x - 1)];
            const p12 = gray[y * width + (x + 1)];

            const p20 = gray[(y + 1) * width + (x - 1)];
            const p21 = gray[(y + 1) * width + x];
            const p22 = gray[(y + 1) * width + (x + 1)];

            const gx = -p00 + p02 - 2 * p10 + 2 * p12 - p20 + p22;
            const gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;

            const magnitude = Math.sqrt(gx * gx + gy * gy);
            edges[idx] = magnitude > edgeThreshold ? 0 : 255; // 0 = black edge, 255 = white background
          }
        }

        // 3. Morphological Dilation for Thick Coloring Book Outlines
        const radius = strokeThickness === 'extra-bold' ? 2 : strokeThickness === 'bold' ? 1 : 0;
        const finalPixels = new Uint8ClampedArray(width * height);
        finalPixels.fill(255);

        for (let y = radius; y < height - radius; y++) {
          for (let x = radius; x < width - radius; x++) {
            const idx = y * width + x;
            if (edges[idx] === 0) {
              for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                  finalPixels[(y + dy) * width + (x + dx)] = 0;
                }
              }
            }
          }
        }

        // 4. Write back to ImageData as black and white
        for (let i = 0; i < finalPixels.length; i++) {
          const pixelVal = finalPixels[i];
          const outIdx = i * 4;
          data[outIdx] = pixelVal;
          data[outIdx + 1] = pixelVal;
          data[outIdx + 2] = pixelVal;
          data[outIdx + 3] = 255;
        }

        ctx.putImageData(imgData, 0, 0);

        // Add cute decorative framing corners
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 6;
        ctx.strokeRect(12, 12, width - 24, height - 24);

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => reject(e);
    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = imageSource.src;
    }
  });
}
