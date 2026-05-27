
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

// --- Color Space Helpers ---
const rgbToHsv = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s, v };
};

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 0, b: 255 };
};

/**
 * Transparent NEO v2 (SteamSafe)
 * Professional Background Removal & Achromatic Neutralization
 */
export const removeBackgroundNeo = (
  srcDataUrl: string,
  config: {
    keyColor?: string,
    tolBg: number,
    tolEdge: number,
    softRadius: number,
    decontamStrength: number,
    preserveTrueMagenta: boolean,
    fxMode: boolean,
    removeHoles: boolean,
    healingPower: number,
    steamSafe?: boolean,
    neutralizeStrength?: number,
    alphaBias?: number
  }
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
      const alphaMatte = new Float32Array(w * h);

      // Pass 0: Calibration (Aggressive Hue Profile)
      let hexKey = config.keyColor || "#FFFFFF";
      const { r: targetR, g: targetG, b: targetB } = hexToRgb(hexKey);
      const keyHsv = rgbToHsv(targetR, targetG, targetB);

      let sumR = 0, sumG = 0, sumB = 0, samples = 0;
      const sampleBorder = (x: number, y: number) => {
        const p = (y * w + x) * 4;
        const dr = data[p] - targetR, dg = data[p+1] - targetG, db = data[p+2] - targetB;
        // Increased threshold to 200 to catch more variations of the key color
        if (Math.sqrt(dr*dr + dg*dg + db*db) < 200) {
          sumR += data[p]; sumG += data[p+1]; sumB += data[p+2];
          samples++;
        }
      };
      // Samples the outer 5px shell
      for(let step=0; step<5; step++) {
        for(let x=step; x<w-step; x+=10) { sampleBorder(x, step); sampleBorder(x, h-1-step); }
        for(let y=step; y<h-step; y+=10) { sampleBorder(step, y); sampleBorder(w-1-step, y); }
      }

      const bgR = samples > 0 ? sumR / samples : targetR;
      const bgG = samples > 0 ? sumG / samples : targetG;
      const bgB = samples > 0 ? sumB / samples : targetB;

      const getDist = (idx: number) => {
        const dr = data[idx] - bgR, dg = data[idx+1] - bgG, db = data[idx+2] - bgB;
        return Math.sqrt(dr*dr*0.299 + dg*dg*0.587 + db*db*0.114);
      };

      // Pass 1: BFS Isolation (Edge-connected background)
      const stack: number[] = [];
      const pushHard = (x: number, y: number) => {
        const p = y * w + x;
        if (!visited[p] && getDist(p * 4) <= config.tolBg) {
          visited[p] = 1; stack.push(p);
        }
      };
      for (let x = 0; x < w; x++) { pushHard(x, 0); pushHard(x, h - 1); }
      for (let y = 0; y < h; y++) { pushHard(0, y); pushHard(w - 1, y); }

      while (stack.length > 0) {
        const p = stack.pop()!;
        isBackground[p] = 1; alphaMatte[p] = 0;
        const x = p % w, y = Math.floor(p / w);
        if (x > 0) pushHard(x - 1, y); if (x < w - 1) pushHard(x + 1, y);
        if (y > 0) pushHard(x, y - 1); if (y < h - 1) pushHard(x, y + 1);
      }

      // Pass 2: NEO Hole Healing (trapped background islands)
      if (config.removeHoles) {
        const minHoleSize = Math.floor(5 + (config.healingPower * 3));
        const holeTolerance = config.tolBg * 1.1; // Slightly more aggressive for trapped gaps
        
        for (let i = 0; i < w * h; i++) {
          if (!visited[i] && getDist(i * 4) <= holeTolerance) {
            const island: number[] = []; 
            const islandStack = [i]; 
            visited[i] = 1;
            
            while (islandStack.length > 0) {
              const p = islandStack.pop()!; island.push(p);
              const x = p % w, y = Math.floor(p / w);
              const neighbors = [p-1, p+1, p-w, p+w];
              for(const n of neighbors) {
                if(n >= 0 && n < w*h && !visited[n] && getDist(n*4) <= holeTolerance) {
                  visited[n] = 1; islandStack.push(n);
                }
              }
            }
            
            // If the island is larger than the noise threshold, treat it as a background hole
            if (island.length >= minHoleSize) {
              for (const p of island) { 
                 isBackground[p] = 1; 
                 alphaMatte[p] = 0; 
              }
            }
          }
        }
      }

      // Pass 3: Soft Matte + Alpha Bias (SteamSafe Edge Extension)
      const bias = (config.alphaBias || 0) / 100;
      for (let i = 0; i < w * h; i++) {
        if (!isBackground[i]) {
          alphaMatte[i] = 1.0;
          const x = i % w, y = Math.floor(i / w);
          // Check for nearby background pixels to trigger matting
          if (x > 0 && isBackground[i-1] || x < w-1 && isBackground[i+1] || y > 0 && isBackground[i-w] || y < h-1 && isBackground[i+w]) {
            const d = getDist(i * 4);
            if (d < config.tolEdge) {
               let factor = (d - config.tolBg) / (config.tolEdge - config.tolBg);
               factor = Math.max(0, Math.min(1, factor));
               alphaMatte[i] = factor + (1 - factor) * bias;
            }
          }
        }
      }

      // Pass 4 & 4.5: Decontam + SteamSafe Neutralization
      const decontam = config.decontamStrength / 100;
      const steamSafe = config.steamSafe ?? true;
      const neutStrength = (config.neutralizeStrength ?? 85) / 100;

      for (let i = 0; i < w * h; i++) {
        const a = alphaMatte[i]; const idx = i * 4;
        if (a === 0) { data[idx + 3] = 0; continue; }
        
        let r = data[idx], g = data[idx+1], b = data[idx+2];
        
        // Pass 4: Unblend (Chroma Defringing)
        if (a < 1.0) {
          r = (r - (1 - a) * bgR * decontam) / (1 - (1 - a) * decontam);
          g = (g - (1 - a) * bgG * decontam) / (1 - (1 - a) * decontam);
          b = (b - (1 - a) * bgB * decontam) / (1 - (1 - a) * decontam);
        }

        // Pass 4.5: SteamSafe (Achromatic Neutralization)
        if (steamSafe && a < 0.6) {
           const pnlHsv = rgbToHsv(r, g, b);
           const hueDist = Math.min(Math.abs(pnlHsv.h - keyHsv.h), 360 - Math.abs(pnlHsv.h - keyHsv.h));
           
           if (hueDist < 50 && pnlHsv.s > 0.05) {
              const lum = (r * 0.299 + g * 0.587 + b * 0.114);
              const isSparks = (pnlHsv.h > 15 && pnlHsv.h < 75 && pnlHsv.s > 0.5);
              if (!isSparks) {
                 const gray = lum;
                 const k = neutStrength * (1 - a);
                 r = r * (1 - k) + gray * k;
                 g = g * (1 - k) + gray * k;
                 b = b * (1 - k) + gray * k;
              }
           }
        }

        data[idx] = Math.max(0, Math.min(255, r));
        data[idx+1] = Math.max(0, Math.min(255, g));
        data[idx+2] = Math.max(0, Math.min(255, b));
        data[idx+3] = a * 255;
      }

      // FX Mode Glow Guard
      if (config.fxMode) {
        for (let i = 0; i < w * h; i++) {
          const idx = i * 4;
          if (data[idx+3] === 0) continue;
          const lum = (data[idx] * 0.299 + data[idx+1] * 0.587 + data[idx+2] * 0.114);
          if (lum > 200 && data[idx+3] < 120) {
             data[idx+3] = Math.max(data[idx+3], (lum - 200) * 1.5);
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

/**
 * AI-Assisted Background & Hole Removal (Legacy Standard)
 */
export const removeBackground = (
  srcDataUrl: string, 
  tolerance: number = 60, 
  removeHoles: boolean = true,
  healing: number = 100,
  keyColor?: string
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
      const w = canvas.width, h = canvas.height;
      const visited = new Uint8Array(w * h);
      const isBackground = new Uint8Array(w * h);
      
      let rT: number, gT: number, bT: number;

      if (keyColor) {
        const rgb = hexToRgb(keyColor);
        rT = rgb.r; gT = rgb.g; bT = rgb.b;
      } else {
        // Robust Sampling: Check all 4 corners and pick the most likely background color
        const corners = [
          { r: data[0], g: data[1], b: data[2] }, // Top-Left
          { r: data[(w - 1) * 4], g: data[(w - 1) * 4 + 1], b: data[(w - 1) * 4 + 2] }, // Top-Right
          { r: data[(h - 1) * w * 4], g: data[(h - 1) * w * 4 + 1], b: data[(h - 1) * w * 4 + 2] }, // Bottom-Left
          { r: data[((h - 1) * w + (w - 1)) * 4], g: data[((h - 1) * w + (w - 1)) * 4 + 1], b: data[((h - 1) * w + (w - 1)) * 4 + 2] } // Bottom-Right
        ];

        // If we see magenta-like color in any corner, prioritize it (as it's our standard key)
        const magentaCorner = corners.find(c => {
          const dr = c.r - 255, dg = c.g - 0, db = c.b - 255;
          return Math.sqrt(dr*dr + dg*dg + db*db) < 150;
        });

        const targetColor = magentaCorner || corners[0];
        rT = targetColor.r; gT = targetColor.g; bT = targetColor.b;
      }

      const getDist = (idx: number) => Math.sqrt((data[idx] - rT)**2 + (data[idx+1] - gT)**2 + (data[idx+2] - bT)**2);

      const stack: number[] = [];
      const pushExterior = (x: number, y: number) => {
        const p = y * w + x;
        if (!visited[p] && getDist(p * 4) <= tolerance) { visited[p] = 1; stack.push(p); }
      };
      for (let x = 0; x < w; x++) { pushExterior(x, 0); pushExterior(x, h - 1); }
      for (let y = 0; y < h; y++) { pushExterior(0, y); pushExterior(w - 1, y); }

      while (stack.length > 0) {
        const p = stack.pop()!; isBackground[p] = 1;
        const x = p % w, y = Math.floor(p / w);
        if (x > 0) pushExterior(x - 1, y); if (x < w - 1) pushExterior(x + 1, y);
        if (y > 0) pushExterior(x, y - 1); if (y < h - 1) pushExterior(x, y + 1);
      }

      if (removeHoles) {
        const minHoleSize = Math.floor(5 + (healing * 3)); const holeTolerance = tolerance * 0.8;
        for (let i = 0; i < w * h; i++) {
          if (!visited[i] && getDist(i * 4) <= holeTolerance) {
            const island: number[] = []; const islandStack = [i]; visited[i] = 1;
            while (islandStack.length > 0) {
              const p = islandStack.pop()!; island.push(p);
              const x = p % w, y = Math.floor(p / w);
              if (x > 0 && !visited[p-1] && getDist((p-1)*4) <= holeTolerance) { visited[p-1] = 1; islandStack.push(p-1); }
              if (x < w - 1 && !visited[p+1] && getDist((p+1)*4) <= holeTolerance) { visited[p+1] = 1; islandStack.push(p+1); }
              if (y > 0 && !visited[p-w] && getDist((p-w)*4) <= holeTolerance) { visited[p-w] = 1; islandStack.push(p-w); }
              if (y < h - 1 && !visited[p+w] && getDist((p+w)*4) <= holeTolerance) { visited[p+w] = 1; islandStack.push(p+w); }
            }
            if (island.length >= minHoleSize) { for (const p of island) isBackground[p] = 1; }
          }
        }
      }

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = y * w + x; const idx = p * 4;
          if (isBackground[p]) { data[idx + 3] = 0; } else {
            let neighborsBg = 0;
            if (x > 0 && isBackground[p-1]) neighborsBg++; if (x < w - 1 && isBackground[p+1]) neighborsBg++;
            if (y > 0 && isBackground[p-w]) neighborsBg++; if (y < h - 1 && isBackground[p+w]) neighborsBg++;
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
      ctx.putImageData(imageData, 0, 0); resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject; img.src = srcDataUrl;
  });
};

export const base64ToBlobUrl = (base64: string): string => {
  if (!base64 || !base64.startsWith('data:')) return base64;
  try {
    const parts = base64.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Failed to convert base64 to blob URL", e);
    return base64;
  }
};

export const blobUrlToBase64 = async (url: string): Promise<string> => {
  if (url.startsWith('data:')) return url;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
    // Memory optimization: if the image is large, we should optimize it before returning
    // to prevent DataCloneError in performance.measure or state updates
    if (base64.length > 1024 * 1024) { // > 1MB
       return await optimizeBase64Image(base64, 1024, 0.8);
    }
    
    return base64;
  } catch (e) {
    console.error("Failed to convert blob URL to base64", e);
    throw e;
  }
};

export const generateSpriteSheetGrid = (
  imageUrls: string[],
  columns: number = 4
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (imageUrls.length === 0) return reject(new Error("No images provided"));

    const images: HTMLImageElement[] = [];
    let loadedCount = 0;

    const onImageLoad = () => {
      loadedCount++;
      if (loadedCount === imageUrls.length) {
        // All images loaded, draw to canvas
        const firstImg = images[0];
        const frameWidth = firstImg.width;
        const frameHeight = firstImg.height;
        const rows = Math.ceil(imageUrls.length / columns);

        const canvas = document.createElement('canvas');
        canvas.width = frameWidth * columns;
        canvas.height = frameHeight * rows;
        const ctx = canvas.getContext('2d');

        if (!ctx) return reject(new Error("Could not get canvas context"));

        images.forEach((img, index) => {
          const col = index % columns;
          const row = Math.floor(index / columns);
          ctx.drawImage(img, col * frameWidth, row * frameHeight, frameWidth, frameHeight);
        });

        resolve(canvas.toDataURL('image/png'));
      }
    };

    imageUrls.forEach((url, i) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = onImageLoad;
      img.onerror = () => reject(new Error(`Failed to load image at index ${i}`));
      img.src = url;
      images[i] = img;
    });
  });
};

export const sliceImageIntoTiles = (
  imageUrl: string,
  rows: number,
  cols: number
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const tileWidth = Math.floor(img.width / cols);
      const tileHeight = Math.floor(img.height / rows);
      const tiles: string[] = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const canvas = document.createElement('canvas');
          canvas.width = tileWidth;
          canvas.height = tileHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          ctx.drawImage(
            img,
            c * tileWidth,
            r * tileHeight,
            tileWidth,
            tileHeight,
            0,
            0,
            tileWidth,
            tileHeight
          );
          tiles.push(canvas.toDataURL('image/png'));
        }
      }
      resolve(tiles);
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
};
