// Service for Gemini Agent (ADK) Workflows in MythicFrame
import { GoogleGenAI } from "@google/genai";
import { getApiKey, extractImageFromInteraction } from "./geminiService";
import { GameContext, GenerationModel, AspectRatio, ImageSize } from "../types";

export interface AgentPipelineStep {
  step: 'concept' | 'anchor' | 'variation';
  title: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  data?: any;
  imageUrl?: string;
  error?: string;
}

export interface AgentAssetPipelineResult {
  conceptBrief: {
    name: string;
    description: string;
    colorPalette: string[];
    visualKeyElements: string[];
    masterPrompt: string;
  };
  anchorImageUrl: string;
  variations: {
    name: string;
    prompt: string;
    imageUrl: string;
  }[];
  interactionIds: string[];
}

const getClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("No Gemini API key found. Please provide an API key in Settings or .env.local.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Autonomous Gemini Agent Pipeline:
 * Step 1: Creative Art Director turn (analyzes lore and synthesizes a master concept prompt)
 * Step 2: Generates anchor master asset via Interactions API
 * Step 3: Generates variations maintaining visual coherence via multi-turn interaction chaining
 */
export async function runAutonomousAssetPipeline(
  seedPrompt: string,
  gameContext: GameContext,
  options: {
    variationCount?: number;
    variationPrompts?: string[];
    aspectRatio?: AspectRatio;
    imageSize?: ImageSize;
    useProModel?: boolean;
    onProgress?: (step: string, percent: number) => void;
  } = {}
): Promise<AgentAssetPipelineResult> {
  const ai = getClient();
  const onProgress = options.onProgress || (() => {});
  const useProModel = options.useProModel ?? false;
  const imageModel = useProModel ? GenerationModel.PRO_3 : GenerationModel.FLASH_3_1;
  const reasoningModel = 'gemini-3.8-flash';
  const aspectRatio = options.aspectRatio || '3:4';
  const variationCount = options.variationCount || 2;

  const interactionIds: string[] = [];

  // ==========================================
  // Turn 1: Art Director Planning Turn
  // ==========================================
  onProgress("Art Director Agent: Analyzing game lore and designing character brief...", 15);

  const planningInput = `You are the Lead Art Director for a game project.
Setting Context: ${gameContext.setting || 'High Fantasy'}
Tone: ${gameContext.tone || 'Epic'}
Visual Constraints: ${gameContext.visualConstraints || 'None'}

User Concept Idea: "${seedPrompt}"

Create a structured character art brief in strictly valid JSON format with this exact schema:
{
  "name": "Character Name",
  "description": "Short 2-sentence background lore",
  "colorPalette": ["Primary Hex/Name", "Secondary", "Accent"],
  "visualKeyElements": ["Feature 1", "Signature gear", "Visual motif"],
  "masterPrompt": "Extremely detailed text-to-image prompt without formatting or markdown, specifying subject, outfit, lighting, textures, camera angle"
}`;

  const planningInteraction = await ai.interactions.create({
    model: reasoningModel,
    input: planningInput,
    response_format: { type: 'json_object' }
  });

  if (planningInteraction.id) interactionIds.push(planningInteraction.id);

  let conceptBrief: any = {
    name: "Heroic Concept",
    description: seedPrompt,
    colorPalette: ["#1A1A2E", "#E94560", "#0F3460"],
    visualKeyElements: ["Signature armor", "Atmospheric lighting"],
    masterPrompt: `${seedPrompt}, high quality game art, setting: ${gameContext.setting}`
  };

  try {
    const rawText = planningInteraction.output_text || "";
    if (rawText) {
      conceptBrief = JSON.parse(rawText);
    }
  } catch (e) {
    console.warn("Could not parse JSON from Art Director Agent, using raw prompt fallback.", e);
    if (planningInteraction.output_text) {
      conceptBrief.masterPrompt = planningInteraction.output_text;
    }
  }

  // ==========================================
  // Turn 2: Master Anchor Image Generation
  // ==========================================
  onProgress(`Rendering Master Anchor Asset using ${imageModel}...`, 40);

  const anchorFormat: any = {
    type: 'image',
    aspect_ratio: aspectRatio === 'custom' ? '16:9' : aspectRatio
  };
  if (useProModel && options.imageSize) {
    anchorFormat.image_size = options.imageSize;
  }

  const anchorInteraction = await ai.interactions.create({
    model: imageModel,
    input: [
      {
        type: 'text',
        text: `${conceptBrief.masterPrompt}. Setting: ${gameContext.setting}. High-end video game splash illustration, crisp details, zero text/labels.`
      }
    ],
    system_instruction: "You are an elite game asset rendering engine. ONLY return image data. ZERO text inside the image.",
    response_format: anchorFormat
  });

  if (anchorInteraction.id) interactionIds.push(anchorInteraction.id);

  const anchorImageUrl = extractImageFromInteraction(anchorInteraction);
  if (!anchorImageUrl) {
    throw new Error(anchorInteraction.errors?.[0]?.message || "Master anchor image generation failed.");
  }

  // ==========================================
  // Turn 3: Variations Chained to Anchor Context
  // ==========================================
  const variations: { name: string; prompt: string; imageUrl: string }[] = [];
  const defaultVarPrompts = [
    "Combat stance ready for battle, dynamic angle, spell aura active",
    "Relaxed idle tavern pose, holding drink or parchment, gentle lighting",
    "Close-up portrait focusing on emotional expression and helmet details"
  ];

  const targetVariations = options.variationPrompts || defaultVarPrompts.slice(0, variationCount);

  for (let idx = 0; idx < targetVariations.length; idx++) {
    const varPrompt = targetVariations[idx];
    const progressPct = 40 + Math.round(((idx + 1) / targetVariations.length) * 55);
    onProgress(`Agent Pipeline: Synthesizing Variation ${idx + 1}/${targetVariations.length}...`, progressPct);

    // Chained interaction linking previous_interaction_id to maintain character visual continuity
    const varInteraction = await ai.interactions.create({
      model: imageModel,
      previous_interaction_id: anchorInteraction.id,
      input: [
        {
          type: 'text',
          text: `Create an alternate variation of the exact same character with this variation: ${varPrompt}. Maintain identical facial features, clothing aesthetic, hair color, and art style. Zero text in image.`
        }
      ],
      system_instruction: "Maintain strict character identity and art style continuity with the previous asset. Output only image data.",
      response_format: anchorFormat
    });

    if (varInteraction.id) interactionIds.push(varInteraction.id);

    const varImg = extractImageFromInteraction(varInteraction);
    if (varImg) {
      variations.push({
        name: `Variation ${idx + 1}`,
        prompt: varPrompt,
        imageUrl: varImg
      });
    }
  }

  onProgress("Agent pipeline successfully completed!", 100);

  return {
    conceptBrief,
    anchorImageUrl,
    variations,
    interactionIds
  };
}
