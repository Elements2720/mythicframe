
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import { HistoryEntry, ExportConfig, GameContext, ResizeItem } from "../types";
import { APP_NAME, APP_VERSION } from "../constants";

// Helper to download a blob
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Base64 to Blob helper
const base64ToBlob = async (base64: string): Promise<Blob> => {
  const res = await fetch(base64);
  return await res.blob();
};

export const exportSingleImage = (imageDataUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = imageDataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportCompositeCard = async (element: HTMLElement, filename: string) => {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: null, // Transparent background if possible
      scale: 2, // Higher quality
      useCORS: true, // Allow loading cross-origin images (like placeholders)
      logging: false
    });
    
    const dataUrl = canvas.toDataURL('image/png');
    exportSingleImage(dataUrl, filename);
  } catch (error) {
    console.error("Failed to export composite card", error);
    throw error;
  }
};

export const exportSessionImages = async (images: string[], baseName: string) => {
  if (!images || images.length === 0) return;
  
  const zip = new JSZip();
  const folder = zip.folder("session_images");
  
  if (folder) {
    for (let i = 0; i < images.length; i++) {
      try {
        const blob = await base64ToBlob(images[i]);
        folder.file(`${baseName}_${i + 1}.png`, blob);
      } catch (e) {
        console.error(`Failed to add image ${i} to zip`, e);
      }
    }
  }

  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, `${baseName}_batch.zip`);
};

export const exportZip = async (
  entry: HistoryEntry,
  config: ExportConfig,
  gameContext?: GameContext,
  currentImageOverride?: string | null
) => {
  const timestamp = new Date(entry.timestamp).toISOString().replace(/[:.]/g, '-');
  const baseName = `${APP_NAME}_${entry.mode}_${timestamp}`;

  // Smart Export: If only image is requested AND no animation/data, download directly as PNG
  const hasAnimation = !!entry.animationData && entry.animationData.frames.length > 0;
  const isCardProject = entry.mode === 'fullcard';
  
  // Use override image if provided (the one currently on screen), otherwise entry thumbnail
  const imageToExport = currentImageOverride || entry.thumbnailUrl;

  if (config.includeImage && !config.includePrompts && !hasAnimation && !isCardProject) {
    if (imageToExport) {
      exportSingleImage(imageToExport, `${baseName}.png`);
    } else {
      console.error("No image data found to export.");
    }
    return;
  }

  const zip = new JSZip();

  // 1. Add Thumbnail Image
  if (config.includeImage && imageToExport) {
    try {
      const blob = await base64ToBlob(imageToExport);
      zip.file(`${baseName}_result.png`, blob);
    } catch (e) {
      console.error("Failed to add image to zip", e);
    }
  }

  // 2. Add Animation Frames (If applicable)
  if (config.includeImage && hasAnimation && entry.animationData) {
     const framesFolder = zip.folder("animation_frames");
     if (framesFolder) {
        let idx = 0;
        for (const frame of entry.animationData.frames) {
           if (frame.imageUrl) {
              try {
                const blob = await base64ToBlob(frame.imageUrl);
                const name = `frame_${String(idx + 1).padStart(3, '0')}.png`;
                framesFolder.file(name, blob);
              } catch(e) {
                 console.error(`Failed to export frame ${idx}`, e);
              }
           }
           idx++;
        }
     }
  }

  // 3. Add Prompt/Metadata
  if (config.includePrompts) {
    const metadata = {
      app: APP_NAME,
      version: APP_VERSION,
      timestamp: entry.timestamp,
      mode: entry.mode,
      prompts: {
        user_prompt: entry.userPrompt,
        full_constructed_prompt: entry.fullPrompt,
      },
      settings: {
        style_id: entry.styleId,
        size: entry.size,
        aspect_ratio: entry.aspectRatio,
        bg_config: entry.bgConfig,
      },
      references: entry.referenceAssets.map(r => ({ note: r.roleNote })),
      game_context: config.includeProjectContext ? entry.gameContext : undefined,
      animation: entry.animationData ? {
         type: entry.animationData.type,
         fps: entry.animationData.fps,
         total_frames: entry.animationData.frames.length,
         frame_prompts: entry.animationData.frames.map(f => f.prompt)
      } : undefined,
      card_data: entry.cardData
    };

    zip.file(`${baseName}_metadata.json`, JSON.stringify(metadata, null, 2));
    
    // Also add a readable TXT file
    let txtContent = `
MYTHICFRAME EXPORT
------------------
Date: ${new Date(entry.timestamp).toLocaleString()}
Mode: ${entry.mode}

USER PROMPT:
${entry.userPrompt}
`;
    if(entry.fullPrompt) {
      txtContent += `
FULL GENERATED PROMPT:
${entry.fullPrompt}
`;
    }

    txtContent += `
SETTINGS:
Style: ${entry.styleId}
Size: ${entry.size}
Background: ${entry.bgConfig.mode} ${entry.bgConfig.color}
`;

    if (entry.animationData) {
       txtContent += `
ANIMATION INFO:
Type: ${entry.animationData.type}
FPS: ${entry.animationData.fps}
Frames: ${entry.animationData.frames.length}
       `;
    }

    if (entry.cardData) {
       txtContent += `
CARD DATA:
Name: ${entry.cardData.name}
Mana: ${entry.cardData.mana}
Type: ${entry.cardData.type}
Description: ${entry.cardData.description}
       `;
    }

    zip.file(`${baseName}_info.txt`, txtContent.trim());
  }

  // Generate and download
  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, `${baseName}.zip`);
};

export const exportResizeBatch = async (queue: ResizeItem[]) => {
  const completedItems = queue.filter(item => item.status === 'done' && item.resultUrl);
  
  if (completedItems.length === 0) {
    console.warn("No completed items to export");
    return;
  }

  const zip = new JSZip();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const folderName = `${APP_NAME}_resize_batch_${timestamp}`;
  const folder = zip.folder(folderName);

  if (!folder) return;

  for (const item of completedItems) {
    if (item.resultUrl) {
      try {
        const blob = await base64ToBlob(item.resultUrl);
        // Sanitize filename
        const safeName = item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        folder.file(`resized_${safeName}.png`, blob);
      } catch (e) {
        console.error(`Failed to add ${item.name} to zip`, e);
      }
    }
  }

  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, `${folderName}.zip`);
};
