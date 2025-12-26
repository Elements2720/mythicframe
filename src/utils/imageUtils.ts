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

// Optimization Helper: Resize to max dimension and compress
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
        resolve(base64Str);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (e) => {
        console.warn("Image optimization failed, using original", e);
        resolve(base64Str);
    };
    img.src = base64Str;
  });
};

// Create a composite for outpainting: Place source image in center of new canvas with Zoom and Pan
export const createCompositeImage = (
  srcDataUrl: string,
  targetWidth: number,
  targetHeight: number,
  zoom: number = 1.0, 
  panX: number = 0,   
  panY: number = 0    
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

      ctx.save();
      ctx.filter = 'blur(40px) brightness(0.9)'; 
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      ctx.restore();

      const scaleW = targetWidth / img.width;
      const scaleH = targetHeight / img.height;
      const baseScale = Math.min(scaleW, scaleH);
      const finalScale = baseScale * zoom;
      const drawW = img.width * finalScale;
      const drawH = img.height * finalScale;
      const x = ((targetWidth - drawW) / 2) + panX;
      const y = ((targetHeight - drawH) / 2) + panY;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, x, y, drawW, drawH);
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = srcDataUrl;
  });
};

/**
 * AI-Assisted Background & Hole Removal with Healing
 * Optimized for Chroma Key (Magenta #FF00FF or Green #00FF00)
 */
export const removeBackground = (
  srcDataUrl: string, 
  tolerance: number = 30, 
  removeHoles: boolean = true,
  healing: number = 100
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) { reject(new Error('No context')); return; }
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width;
      const h = canvas.height;
      
      const visited = new Uint8Array(w * h);
      const isBackground = new Uint8Array(w * h);
      
      // Sample Background Color (Key Color)
      // Check for pure Magenta or Green, otherwise sample corners
      const rT = data[0];
      const gT = data[1];
      const bT = data[2];

      const getDist = (idx: number) => {
        return Math.sqrt((data[idx] - rT)**2 + (data[idx+1] - gT)**2 + (data[idx+2] - bT)**2);
      };

      // PASS 1: Exterior BFS
      const stack: number[] = [];
      const pushExterior = (x: number, y: number) => {
        const p = y * w + x;
        if (!visited[p] && getDist(p * 4) <= tolerance) {
          visited[p] = 1;
          stack.push(p);
        }
      };

      for (let x = 0; x < w; x++) { pushExterior(x, 0); pushExterior(x, h - 1); }
      for (let y = 0; y < h; y++) { pushExterior(0, y); pushExterior(w - 1, y); }

      while (stack.length > 0) {
        const p = stack.pop()!;
        isBackground[p] = 1;
        const x = p % w;
        const y = Math.floor(p / w);
        if (x > 0) pushExterior(x - 1, y);
        if (x < w - 1) pushExterior(x + 1, y);
        if (y > 0) pushExterior(x, y - 1);
        if (y < h - 1) pushExterior(x, y + 1);
      }

      // PASS 2: Intelligent Hole Removal with Healing
      if (removeHoles) {
        const minHoleSize = Math.floor(5 + (healing * 3)); 
        const holeTolerance = tolerance * 0.8;

        for (let i = 0; i < w * h; i++) {
          if (!visited[i] && getDist(i * 4) <= holeTolerance) {
            const island: number[] = [];
            const islandStack = [i];
            visited[i] = 1;

            while (islandStack.length > 0) {
              const p = islandStack.pop()!;
              island.push(p);
              const x = p % w;
              const y = Math.floor(p / w);
              if (x > 0 && !visited[p-1] && getDist((p-1)*4) <= holeTolerance) { visited[p-1] = 1; islandStack.push(p-1); }
              if (x < w - 1 && !visited[p+1] && getDist((p+1)*4) <= holeTolerance) { visited[p+1] = 1; islandStack.push(p+1); }
              if (y > 0 && !visited[p-w] && getDist((p-w)*4) <= holeTolerance) { visited[p-w] = 1; islandStack.push(p-w); }
              if (y < h - 1 && !visited[p+w] && getDist((p+w)*4) <= holeTolerance) { visited[p+w] = 1; islandStack.push(p+w); }
            }

            if (island.length >= minHoleSize) {
              for (const p of island) isBackground[p] = 1;
            }
          }
        }
      }

      // PASS 3: Feathering
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = y * w + x;
          const idx = p * 4;
          if (isBackground[p]) {
            data[idx + 3] = 0; 
          } else {
            let neighborsBg = 0;
            if (x > 0 && isBackground[p-1]) neighborsBg++;
            if (x < w - 1 && isBackground[p+1]) neighborsBg++;
            if (y > 0 && isBackground[p-w]) neighborsBg++;
            if (y < h - 1 && isBackground[p+w]) neighborsBg++;

            if (neighborsBg > 0) {
               const d = getDist(idx);
               if (d < tolerance * 1.5) {
                  const mix = (d - (tolerance * 0.8)) / (tolerance * 0.7);
                  data[idx + 3] = Math.max(0, Math.min(255, mix * 255));
               }
            }
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
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Failed to convert blob URL to base64", e);
    throw e;
  }
};