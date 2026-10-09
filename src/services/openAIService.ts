// Service for OpenAI DALL-E 3 and DALL-E 2 image generation
import { AspectRatio } from '../types';

export const getOpenAIApiKey = (): string => {
  if (typeof window !== 'undefined') {
    const key = localStorage.getItem('mythic_openai_api_key');
    if (key && key.trim()) return key.trim();
  }
  return '';
};

export const setOpenAIApiKey = (key: string): void => {
  if (typeof window !== 'undefined') {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem('mythic_openai_api_key', trimmed);
    } else {
      localStorage.removeItem('mythic_openai_api_key');
    }
  }
};

export function mapAspectRatioToOpenAISize(aspectRatio: AspectRatio): '1024x1024' | '1792x1024' | '1024x1792' {
  if (aspectRatio === '16:9' || aspectRatio === '21:9' || aspectRatio === '4:3') {
    return '1792x1024';
  }
  if (aspectRatio === '9:16' || aspectRatio === '3:4') {
    return '1024x1792';
  }
  return '1024x1024';
}

export const generateOpenAIImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  model = 'dall-e-3',
  quality: 'standard' | 'hd' = 'standard'
): Promise<string> => {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error('No OpenAI API key found. Please set your OpenAI API key in Settings.');
  }

  const size = mapAspectRatioToOpenAISize(aspectRatio);

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'dall-e-3',
      prompt: prompt.slice(0, 3950), // OpenAI limit is 4000 characters
      n: 1,
      size,
      quality,
      response_format: 'b64_json'
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`OpenAI Generation Failed: ${message}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    if (data.data?.[0]?.url) {
      return data.data[0].url;
    }
    throw new Error('OpenAI did not return image data.');
  }

  return `data:image/png;base64,${b64}`;
};

export const testOpenAIConnection = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false, message: err.error?.message || `HTTP ${response.status}` };
    }

    return { success: true, message: 'Connected successfully to OpenAI!' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Network error connecting to OpenAI.' };
  }
};
