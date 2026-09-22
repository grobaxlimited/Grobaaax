/**
 * Utility to square-crop and compress avatar photos client-side.
 * Keeps payload lightweight (< 40KB) for lightning-fast Firebase storage
 * and safe Firestore fallback without exceeding document size limits.
 */
export const compressAvatarImage = (
  file: File | Blob,
  maxDimension = 400,
  quality = 0.85
): Promise<{ blob: Blob; dataUrl: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        return resolve({ blob: file, dataUrl: '' });
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          // Square center-crop
          const minDim = Math.min(originalWidth, originalHeight);
          const startX = (originalWidth - minDim) / 2;
          const startY = (originalHeight - minDim) / 2;

          canvas.width = maxDimension;
          canvas.height = maxDimension;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve({ blob: file, dataUrl: src });
          }

          // Anti-aliasing / smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Fill white background for transparent PNGs converted to JPEG
          ctx.fillStyle = '#1e1b4b';
          ctx.fillRect(0, 0, maxDimension, maxDimension);

          // Draw cropped & resized square
          ctx.drawImage(
            img,
            startX,
            startY,
            minDim,
            minDim,
            0,
            0,
            maxDimension,
            maxDimension
          );

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ blob, dataUrl: compressedDataUrl });
              } else {
                resolve({ blob: file, dataUrl: compressedDataUrl });
              }
            },
            'image/jpeg',
            quality
          );
        } catch (err) {
          console.warn('Canvas compression fallback to raw:', err);
          resolve({ blob: file, dataUrl: src });
        }
      };

      img.onerror = () => {
        resolve({ blob: file, dataUrl: src });
      };

      img.src = src;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Utility to compress document photos (e.g. Student ID Cards, certificates) client-side.
 * Preserves the document aspect ratio while capping max dimension (e.g. 1000px)
 * and keeping the payload lightweight (< 80KB) for fast, reliable storage.
 */
export const compressDocumentImage = (
  file: File | Blob,
  maxDimension = 1000,
  quality = 0.8
): Promise<{ blob: Blob; dataUrl: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        return resolve({ blob: file, dataUrl: '' });
      }

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Scale down proportionally if larger than maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = Math.max(width, 10);
          canvas.height = Math.max(height, 10);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve({ blob: file, dataUrl: src });
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // White background for transparent or empty regions
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw proportionally resized image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ blob, dataUrl: compressedDataUrl });
              } else {
                resolve({ blob: file, dataUrl: compressedDataUrl });
              }
            },
            'image/jpeg',
            quality
          );
        } catch (err) {
          console.warn('Canvas document compression fallback to raw:', err);
          resolve({ blob: file, dataUrl: src });
        }
      };

      img.onerror = () => {
        resolve({ blob: file, dataUrl: src });
      };

      img.src = src;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Utility to compress marketplace product photos from user devices client-side.
 * Preserves high quality while constraining max dimensions (e.g. 1024px)
 * and optimizing file size for instantaneous uploads.
 */
export const compressProductImage = (
  file: File | Blob,
  maxDimension = 1024,
  quality = 0.82
): Promise<{ blob: Blob; dataUrl: string }> => {
  return compressDocumentImage(file, maxDimension, quality);
};

