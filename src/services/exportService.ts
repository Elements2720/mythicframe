
import JSZip from 'jszip';
import { HistoryEntry, ExportConfig, GameContext, ResizeItem, WorkspaceTab } from "../types";
import { APP_NAME, APP_VERSION } from "../constants";

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

const urlToBlob = async (url: string): Promise<Blob> => {
  if (!url) throw new Error("URL is empty");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
  return await response.blob();
};

export const exportSingleImage = (imageDataUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = imageDataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Advanced Project Export
 * Iterates through selected tabs and organizes them into character-specific folders.
 */
export const exportProjectBatch = async (tabs: WorkspaceTab[], config: ExportConfig) => {
  const zip = new JSZip();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `${APP_NAME}_Project_${timestamp}`;

  // Use selected tabs if provided, otherwise all tabs
  const selectedTabs = config.selectedTabIds && config.selectedTabIds.length > 0 
    ? tabs.filter(t => config.selectedTabIds.includes(t.id))
    : tabs;

  for (const tab of selectedTabs) {
    // Generate a unique safe name for the character folder
    const safeCharName = (tab.characterName || tab.name || "Untitled").replace(/[^a-z0-9]/gi, '_');
    const folder = zip.folder(safeCharName);
    if (!folder) continue;

    if (tab.mode === 'gacha') {
       // Export Gacha Slots for Character Bible
       for (const asset of tab.gachaAssets) {
          if (asset.imageUrl && config.includeImage) {
             try {
                const blob = await urlToBlob(asset.imageUrl);
                const safeAssetName = (asset.name || "asset").replace(/[^a-z0-9]/gi, '_');
                folder.file(`${safeAssetName}.png`, blob);
             } catch (e) {
                console.error(`Failed to export asset ${asset.name} for ${safeCharName}`, e);
             }
          }
       }
    } else {
       // Export main result image for other workspace modes
       if (tab.generatedImage && config.includeImage) {
          try {
             const blob = await urlToBlob(tab.generatedImage);
             folder.file(`main_result.png`, blob);
          } catch (e) {
             console.error(`Failed to export main image for ${safeCharName}`, e);
          }
       }
    }

    // Include metadata for each character tab
    if (config.includePrompts) {
       const metadata = {
          character_info: {
             name: tab.characterName,
             subtitle: tab.characterSubtitle,
             race: tab.characterRace,
             gender: tab.characterGender,
             traits: tab.characterTraits,
          },
          workspace_info: {
             mode: tab.mode,
             style_id: tab.selectedStyleId,
             aspect_ratio: tab.selectedAspectRatio,
             size: tab.selectedSize,
             base_prompt: tab.prompt
          },
          export_info: {
             app: APP_NAME,
             version: APP_VERSION,
             timestamp: new Date().toISOString()
          }
       };
       folder.file('character_metadata.json', JSON.stringify(metadata, null, 2));
    }
  }

  // Add global project context if requested
  if (config.includeProjectContext) {
     const projectMeta = {
        project_name: baseName,
        total_tabs: selectedTabs.length,
        tabs: selectedTabs.map(t => ({ id: t.id, name: t.name, mode: t.mode }))
     };
     zip.file('project_overview.json', JSON.stringify(projectMeta, null, 2));
  }

  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, `${baseName}.zip`);
};

export const exportZip = async (
  entry: HistoryEntry,
  config: ExportConfig,
  gameContext?: GameContext,
  currentImageOverride?: string | null
) => {
  const timestamp = new Date(entry.timestamp).toISOString().replace(/[:.]/g, '-');
  const baseName = `${APP_NAME}_${entry.mode}_${timestamp}`;
  const imageToExport = currentImageOverride || entry.thumbnailUrl;

  const zip = new JSZip();
  if (config.includeImage && imageToExport) {
    try {
      const blob = await urlToBlob(imageToExport);
      zip.file(`${baseName}_result.png`, blob);
    } catch (e) {
       console.error("ZIP single image export failed", e);
    }
  }

  if (config.includePrompts) {
    const metadata = { 
       app: APP_NAME, 
       version: APP_VERSION, 
       mode: entry.mode, 
       user_prompt: entry.userPrompt,
       full_prompt: entry.fullPrompt,
       timestamp: entry.timestamp
    };
    zip.file(`metadata.json`, JSON.stringify(metadata, null, 2));
  }

  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, `${baseName}.zip`);
};

export const exportSessionImages = async (images: string[], baseName: string) => {
  if (!images || images.length === 0) return;
  const zip = new JSZip();
  const folder = zip.folder("batch_export");
  if (folder) {
    for (let i = 0; i < images.length; i++) {
      try {
        const blob = await urlToBlob(images[i]);
        folder.file(`${baseName}_${i + 1}.png`, blob);
      } catch (e) {
         console.error(`Batch image ${i} export failed`, e);
      }
    }
  }
  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, `${baseName}_batch.zip`);
};

export const exportResizeBatch = async (queue: ResizeItem[]) => {
  const completedItems = queue.filter(item => item.status === 'done' && item.resultUrl);
  if (completedItems.length === 0) return;
  const zip = new JSZip();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const folder = zip.folder(`resize_batch_${timestamp}`);
  if (!folder) return;
  for (const item of completedItems) {
    if (item.resultUrl) {
      try {
        const blob = await urlToBlob(item.resultUrl);
        const safeName = (item.name || "untitled").replace(/[^a-z0-9]/gi, '_').toLowerCase();
        folder.file(`resized_${safeName}.png`, blob);
      } catch (e) {
         console.error(`Resize batch item ${item.id} failed`, e);
      }
    }
  }
  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, `resize_batch_${timestamp}.zip`);
};
