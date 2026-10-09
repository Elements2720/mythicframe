// Service for OpenCode and OpenAI-compatible custom endpoints (LocalAI, Ollama, LM Studio, etc.)
import { AspectRatio } from '../types';

export interface OpenCodeConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
}

export const getOpenCodeConfig = (): OpenCodeConfig => {
  if (typeof window !== 'undefined') {
    const baseUrl = localStorage.getItem('mythic_opencode_base_url') || 'http://localhost:11434/v1';
    const apiKey = localStorage.getItem('mythic_opencode_api_key') || '';
    const model = localStorage.getItem('mythic_opencode_model') || 'flux-schnell';
    return { baseUrl, apiKey, model };
  }
  return { baseUrl: 'http://localhost:11434/v1', model: 'flux-schnell' };
};

export const setOpenCodeConfig = (config: Partial<OpenCodeConfig>): void => {
  if (typeof window !== 'undefined') {
    if (config.baseUrl !== undefined) localStorage.setItem('mythic_opencode_base_url', config.baseUrl.trim());
    if (config.apiKey !== undefined) localStorage.setItem('mythic_opencode_api_key', config.apiKey.trim());
    if (config.model !== undefined) localStorage.setItem('mythic_opencode_model', config.model.trim());
  }
};

export const generateOpenCodeImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  configOverride?: Partial<OpenCodeConfig>
): Promise<string> => {
  const current = getOpenCodeConfig();
  const baseUrl = (configOverride?.baseUrl || current.baseUrl).replace(/\/+$/, '');
  const apiKey = configOverride?.apiKey ?? current.apiKey;
  const model = configOverride?.model || current.model;

  if (!baseUrl) {
    throw new Error('No OpenCode/Custom Base URL configured. Please check your settings.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (apiKey && apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  // Attempt standard OpenAI-compatible image endpoint: /images/generations
  const endpoint = `${baseUrl}/images/generations`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model || 'flux-schnell',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json'
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`OpenCode Endpoint Error: ${message}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (b64) {
    return `data:image/png;base64,${b64}`;
  }

  const url = data.data?.[0]?.url;
  if (url) {
    return url;
  }

  throw new Error('Custom endpoint responded without image data.');
};

export const testOpenCodeConnection = async (
  baseUrl: string,
  apiKey?: string
): Promise<{ success: boolean; message: string; models?: string[] }> => {
  try {
    const cleanUrl = baseUrl.trim().replace(/\/+$/, '');
    const headers: Record<string, string> = {};
    if (apiKey && apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const response = await fetch(`${cleanUrl}/models`, { headers });
    if (!response.ok) {
      return { success: false, message: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json().catch(() => ({}));
    const modelList = Array.isArray(data.data) ? data.data.map((m: any) => m.id || m.name) : [];
    return {
      success: true,
      message: `Connected successfully! Found ${modelList.length} models.`,
      models: modelList
    };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to connect to custom endpoint.' };
  }
};
