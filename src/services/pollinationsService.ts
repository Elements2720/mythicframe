// Service for free zero-key image generation via Pollinations.ai
import { AspectRatio } from '../types';
import { getResolutionForAspectRatio } from '../utils/promptExporter';

export const generatePollinationsImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  seed?: number | null
): Promise<string> => {
  const res = getResolutionForAspectRatio(aspectRatio);
  const cleanPrompt = encodeURIComponent(prompt.trim());
  const seedVal = seed !== undefined && seed !== null ? seed : Math.floor(Math.random() * 10000000);
  
  const url = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${res.width}&height=${res.height}&seed=${seedVal}&nologo=true&enhance=false`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Pollinations request failed: HTTP ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert Pollinations image to base64.'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading image blob.'));
    reader.readAsDataURL(blob);
  });
};
