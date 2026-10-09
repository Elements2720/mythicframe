// Service for free zero-key image generation via Pollinations.ai
import { AspectRatio } from '../types';
import { getResolutionForAspectRatio } from '../utils/promptExporter';

export const POLLINATIONS_MODELS = [
  { id: 'flux', name: 'Flux Schnell (Balanced, High Quality)' },
  { id: 'turbo', name: 'SD Turbo (Ultra Fast)' },
  { id: 'flux-realism', name: 'Flux Realism (Photorealistic)' },
  { id: 'flux-anime', name: 'Flux Anime (Anime & Manga)' },
  { id: 'flux-3d', name: 'Flux 3D (Game Assets & 3D Renders)' }
];

export const getPollinationsModel = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('mythic_pollinations_model') || 'flux';
  }
  return 'flux';
};

export const setPollinationsModel = (model: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mythic_pollinations_model', model);
  }
};

export const generatePollinationsImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  seed?: number | null,
  model?: string
): Promise<string> => {
  const res = getResolutionForAspectRatio(aspectRatio);
  // Clamp dimensions to multiples of 64 and max 1024 for stability
  const w = Math.min(1024, Math.max(512, Math.round(res.width / 64) * 64));
  const h = Math.min(1024, Math.max(512, Math.round(res.height / 64) * 64));
  
  // Limit URL length to avoid 414 / Cloudflare rejection
  const cleanPrompt = encodeURIComponent(prompt.trim().slice(0, 1500));
  const seedVal = seed !== undefined && seed !== null ? seed : Math.floor(Math.random() * 10000000);
  const selectedModel = model || getPollinationsModel();
  const modelParam = selectedModel && selectedModel !== 'flux' ? `&model=${encodeURIComponent(selectedModel)}` : '';
  
  const primaryUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${w}&height=${h}&seed=${seedVal}${modelParam}&nologo=true&enhance=false`;

  let response: Response;
  try {
    response = await fetch(primaryUrl);
  } catch (err: any) {
    // If primary failed or timed out, attempt fallback with turbo
    const fallbackUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=768&height=768&seed=${seedVal}&model=turbo`;
    response = await fetch(fallbackUrl);
  }

  // If HTTP 402 (payment required for nologo) or 403, retry without nologo or with turbo
  if (response.status === 402 || response.status === 403) {
    const retryUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${w}&height=${h}&seed=${seedVal}&model=turbo`;
    const retryResp = await fetch(retryUrl);
    if (retryResp.ok) {
      response = retryResp;
    }
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(
      `Pollinations request failed: HTTP ${response.status} ${response.statusText}${
        errText ? ` - ${errText.slice(0, 150)}` : ''
      }`
    );
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

/**
 * 100% Free, Zero-Key AI Text Generation via Pollinations
 * Used for AI prompt refinement and inspiration without consuming image generation quota.
 */
export const generateAIText = async (prompt: string, systemPrompt?: string): Promise<string> => {
  const fullPrompt = systemPrompt 
    ? `${systemPrompt}\n\nTask: "${prompt}"\nRespond with ONLY the result text without introductory remarks or quotes.`
    : prompt;
  
  const cleanPrompt = encodeURIComponent(fullPrompt.trim().slice(0, 2000));
  const url = `https://text.pollinations.ai/${cleanPrompt}?model=openai`;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) {
      const text = (await resp.text()).trim();
      return text.replace(/^["']|["']$/g, '').trim();
    }
  } catch (err) {
    console.warn('[Pollinations Text] Request notice:', err);
  }
  return '';
};
