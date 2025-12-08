

// Helper to resize image to exact custom dimensions (Client-side)
export const resizeToCustomSize = (srcDataUrl: string, width: number, height: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));

      // Draw "Cover" style (preserving aspect ratio, cropping edges)
      const scale = Math.max(width / img.width, height / img.height);
      const x = (width - img.width * scale) / 2;
      const y = (height - img.height * scale) / 2;

      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = srcDataUrl;
  });
};

// New Optimization Helper: Resize to max dimension and compress
export const optimizeBase64Image = (
  base64Str: string, 
  maxDimension: number = 1024, 
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback if context fails
        resolve(base64Str);
        return;
      }

      // High quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Return as JPEG for better compression than PNG for photos/art
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (e) => {
        // Fallback to original if loading fails
        console.warn("Image optimization failed, using original", e);
        resolve(base64Str);
    };
    img.src = base64Str;
  });
};

// Create a composite for outpainting: Place source image in center of new canvas with Zoom and Pan
// UPDATED: Uses Blur-Fill for the background instead of black
export const createCompositeImage = (
  srcDataUrl: string,
  targetWidth: number,
  targetHeight: number,
  zoom: number = 1.0, // 1.0 = Fit (Contain) logic
  panX: number = 0,   // Horizontal offset in pixels
  panY: number = 0    // Vertical offset in pixels
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));

      // 1. Draw Blur Background (Content Aware Guide)
      // Instead of black, we stretch the image to cover the canvas and blur it.
      // This gives the AI color hints for outpainting.
      ctx.save();
      ctx.filter = 'blur(40px) brightness(0.9)'; // Heavy blur + slight darken
      
      // Draw stretched image to cover full background
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      
      ctx.restore();

      // 2. Calculate placement of the sharp source
      // Standard "Contain" scale
      const scaleW = targetWidth / img.width;
      const scaleH = targetHeight / img.height;
      const baseScale = Math.min(scaleW, scaleH);
      
      const finalScale = baseScale * zoom;
      
      const drawW = img.width * finalScale;
      const drawH = img.height * finalScale;
      
      // Center + Pan
      const x = ((targetWidth - drawW) / 2) + panX;
      const y = ((targetHeight - drawH) / 2) + panY;

      // 3. Draw Sharp Source
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, x, y, drawW, drawH);
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = srcDataUrl;
  });
};

// Crop image based on percentage coordinates (x, y, width, height: 0-100)
export const cropImage = (
  srcDataUrl: string, 
  xPercent: number, 
  yPercent: number, 
  wPercent: number, 
  hPercent: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // Calculate pixel values
      const pxX = (xPercent / 100) * img.width;
      const pxY = (yPercent / 100) * img.height;
      const pxW = (wPercent / 100) * img.width;
      const pxH = (hPercent / 100) * img.height;

      // Ensure valid dimensions
      if (pxW <= 0 || pxH <= 0) {
         return reject(new Error('Invalid crop dimensions'));
      }

      canvas.width = pxW;
      canvas.height = pxH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));

      ctx.drawImage(img, pxX, pxY, pxW, pxH, 0, 0, pxW, pxH);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = srcDataUrl;
  });
};

// Remove background using Flood Fill algorithm (Smart Remover)
export const removeBackground = (srcDataUrl: string, tolerance: number = 25): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No context')); return; }
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width;
      const h = canvas.height;
      
      // We use a typed array for visited to handle large images efficiently
      const visited = new Uint8Array(w * h);
      
      // Target Color (Sample Top Left pixel)
      // Assumption: The background is uniform starting from corners
      const rT = data[0];
      const gT = data[1];
      const bT = data[2];

      // Stack for DFS/Flood Fill
      // Storing index p = y * w + x
      const stack: number[] = []; 
      
      // Helper to check color match
      const isMatch = (idx: number) => {
         const r = data[idx];
         const g = data[idx+1];
         const b = data[idx+2];
         return Math.abs(r - rT) <= tolerance &&
                Math.abs(g - gT) <= tolerance &&
                Math.abs(b - bT) <= tolerance;
      };

      // Seed all 4 corners if they match the background color
      // This handles cases where the subject touches one edge but not others
      const corners = [0, w-1, (h-1)*w, (h-1)*w + (w-1)];
      for (const p of corners) {
          if (isMatch(p*4)) {
              stack.push(p);
              visited[p] = 1;
          }
      }

      // If no corners matched (unlikely if user requested white background), try anyway from 0,0
      if (stack.length === 0) {
          stack.push(0);
          visited[0] = 1;
      }

      while (stack.length > 0) {
        const p = stack.pop();
        if (p === undefined) continue;

        const x = p % w;
        const y = Math.floor(p / w);
        
        // Make pixel transparent
        const idx = p * 4;
        data[idx+3] = 0; 

        // Check Neighbors (Up, Down, Left, Right)
        const neighbors: number[] = [];
        if (x > 0) neighbors.push(p - 1);
        if (x < w - 1) neighbors.push(p + 1);
        if (y > 0) neighbors.push(p - w);
        if (y < h - 1) neighbors.push(p + w);

        for (const np of neighbors) {
           if (visited[np]) continue;
           
           if (isMatch(np * 4)) {
               visited[np] = 1;
               stack.push(np);
           }
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = srcDataUrl;
  });
};

export const blobUrlToBase64 = async (url: string): Promise<string> => {
  if (url.startsWith('data:')) return url;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Failed to convert blob URL to base64", e);
    throw e;
  }
};
