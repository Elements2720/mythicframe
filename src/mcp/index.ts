import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  buildIllustrationPrompt,
  buildUIReimaginePrompt,
  buildClothesPrompt,
  buildMapGridPrompt,
  buildPoseStudioPrompt,
  buildSpriteSheetPromptsPrompt,
  buildFramePrompt,
  buildBackgroundAssetPrompt,
  buildExtractClothesPrompt,
  buildCardSuggestionsPrompt
} from "../services/promptTemplates.js";
import { GameContext, BackgroundConfig, MapGridConfig, PoseData } from "../types.js";

const server = new Server(
  {
    name: "mythic-advanced-mcp",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import {
  checkMythicStatus,
  launchMythicServer,
  openBEITab,
  generateWithBEI
} from "./beiClient.js";

// Helper to format output instructions for image generation
const executeImageGeneration = async (promptStr: string, aspectRatio: string = "1:1", toolName: string, apiKey?: string) => {
    const effectiveKey = apiKey || process.env.GEMINI_API_KEY;
    if (!effectiveKey) {
        // Fallback: Check if BEI extension bridge is available
        const status = await checkMythicStatus();
        if (status.beiConnected && status.tabs.some(t => t.target === 'gemini' || t.target === 'chatgpt')) {
            const beiRes = await generateWithBEI({
                prompt: promptStr,
                aspectRatio,
                target: 'gemini'
            });
            const formattedPath = beiRes.filePath.replace(/\\/g, '/');
            return `IMAGE GENERATED SUCCESSFULLY VIA BEI!\n\nAgent, the image has been generated using Browser Extension Interface (BEI) with active Google Gemini session and saved here: ${beiRes.filePath}\n\nPlease embed this image for the user, AND provide a clickable markdown link [${path.basename(beiRes.filePath)}](file:///${formattedPath}) so they can easily open it!`;
        }

        throw new Error(
            "Missing geminiApiKey and no active BEI browser session connected.\n" +
            "Options to generate:\n" +
            "1. Pass 'geminiApiKey' or set GEMINI_API_KEY in .env.local (link: https://ai.google.dev/gemini-api/docs/api-key).\n" +
            "2. Ensure MythicFrame is running (use 'mythic_launch_server') and open Google Gemini in Chrome with the BEI extension."
        );
    }
    let aspectForGemini = "1:1";
    const ratio = aspectRatio.split(" ")[0];
    if (ratio === "16:9") { aspectForGemini = "16:9"; }
    if (ratio === "9:16") { aspectForGemini = "9:16"; }
    if (ratio === "3:4") { aspectForGemini = "3:4"; }
    if (ratio === "4:3") { aspectForGemini = "4:3"; }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${effectiveKey}`;
    const body = {
      instances: [{ prompt: promptStr }],
      parameters: { sampleCount: 1, aspectRatio: aspectForGemini }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error: ${errorText}`);
        }
        const data = await response.json();
        const base64Data = data.predictions[0].bytesBase64Encoded;
        const arrayBuffer = Buffer.from(base64Data, 'base64');
        
        const projectRoot = "d:\\\\GeminiWeb\\\\mythicframe";
        const outDir = path.join(projectRoot, "outputs");
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

        const fileName = `${toolName}_${Date.now()}.jpg`;
        const filePath = path.join(outDir, fileName);

        fs.writeFileSync(filePath, arrayBuffer);
        return `IMAGE GENERATED SUCCESSFULLY!\n\nAgent, the image has been generated using Gemini Imagen 3 and saved here: ${filePath}\n\nPlease embed this image for the user, AND provide a clickable markdown link [${fileName}](file:///${filePath.replace(/\\\\/g, '/')}) so they can easily open it!`;
    } catch (e: any) {
        throw new Error(`Failed to generate Gemini image: ${e.message}`);
    }
};

// Helper to format output instructions for text generation
const formatTextInstruction = (promptStr: string) => {
    return `PROMPT OPTIMIZED SUCCESSFULLY!\n\nAGENT INSTRUCTION: Now, use your internal LLM reasoning to directly answer the user using the following prompt.\n\n---START PROMPT---\n${promptStr}\n---END PROMPT---`;
};

// Default empty structures to prevent null errors
const defaultGameContext: GameContext = { setting: "High Fantasy", tone: "Epic" } as any;
const defaultBgConfig: BackgroundConfig = { mode: "transparent" } as any;

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "prepare_illustration_prompt",
        description: "Prepares a highly optimized illustration or character prompt using MythicFrame rules.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            prompt: { type: "string" },
            aspectRatio: { type: "string" },
            style: { type: "string" },
            viewpoint: { type: "string" },
            framing: { type: "string" },
            backgroundMode: { type: "string", description: "'solid', 'transparent', 'scene', 'pattern', 'none', 'prompt-only', or 'AI Decides'" },
            backgroundColor: { type: "string", description: "Hex color if solid, e.g. '#FFFFFF'" },
            chibiMode: { type: "boolean" },
            chibiRatio: { type: "string", description: "'1:1' (micro_2h), '1:2' (chibi_3h), or '1:4' (deformed_4h)" },
            noCharacters: { type: "boolean" }
          },
          required: ["prompt"],
        },
      },
      {
        name: "prepare_ui_reimagine_prompt",
        description: "Prepares a prompt for UI/HUD Reimagine feature.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            prompt: { type: "string" },
            styleSnippet: { type: "string" },
            uiMood: { type: "string" },
            uiArchetype: { type: "string" },
            uiMaterial: { type: "string" }
          },
          required: ["prompt"],
        },
      },
      {
        name: "prepare_clothes_prompt",
        description: "Prepares a prompt for the Clothes Designer.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            prompt: { type: "string" },
            styleSnippet: { type: "string" }
          },
          required: ["prompt"],
        },
      },
      {
        name: "prepare_map_grid_prompt",
        description: "Prepares a prompt for the Map Grid generator.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            prompt: { type: "string" },
            styleSnippet: { type: "string" },
            viewMode: { type: "string", description: "'top-down' or 'isometric'" },
            primaryColor: { type: "string" }
          },
          required: ["prompt"],
        },
      },
      {
        name: "prepare_pose_studio_prompt",
        description: "Prepares a Pose Studio prompt forcing strict skeletal adherence.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            prompt: { type: "string" },
            styleSnippet: { type: "string" }
          },
          required: ["prompt"],
        },
      },
      {
        name: "prepare_sprite_sheet_prompts",
        description: "Prepares a text-generation prompt asking for a list of sprite sheet poses.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            prompt: { type: "string" },
            frameCount: { type: "number" }
          },
          required: ["prompt", "frameCount"],
        },
      },
      {
        name: "prepare_frame_prompt",
        description: "Prepares an image prompt for generating UI frames or borders.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            prompt: { type: "string" },
            styleSnippet: { type: "string" },
            elements: { type: "array", items: { type: "string" } }
          },
          required: ["prompt", "elements"],
        },
      },
      {
        name: "prepare_background_asset_prompt",
        description: "Prepares an image prompt for generating a background asset.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            prompt: { type: "string" },
            styleSnippet: { type: "string" },
            patternType: { type: "string" }
          },
          required: ["prompt", "patternType"],
        },
      },
      {
        name: "prepare_extract_clothes_prompt",
        description: "Prepares an image prompt for ghosting out biological parts and keeping clothes.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
             backgroundMode: { type: "string", description: "'transparent' or 'solid'" }
          },
          required: [],
        },
      },
      {
        name: "prepare_card_suggestions_prompt",
        description: "Prepares a text prompt for generating TCG card name and effect suggestions based on art.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
             artPrompt: { type: "string" },
             currentName: { type: "string" }
          },
          required: ["prompt"],
        },
      },
      {
        name: "batch_studio_generate",
        description: "Generates a batch of images for multiple subjects and variations using the free API.",
        inputSchema: {
          type: "object",
          properties: {
            geminiApiKey: { type: "string" },
            subjects: { type: "array", items: { type: "string" }, description: "Array of character prompts" },
            variations: { type: "array", items: { type: "string" }, description: "Array of variations, e.g. ['full-body', 'waist-up', 'chibi']" },
            aspectRatio: { type: "string" },
            style: { type: "string" },
            backgroundMode: { type: "string" },
            backgroundColor: { type: "string" },
            chibiRatio: { type: "string", description: "'1:1', '1:2', or '1:4'" }
          },
          required: ["subjects", "variations"],
        },
      },
      {
        name: "mythic_status",
        description: "Checks whether MythicFrame web server (localhost:3488) and BEI browser bridge (port 58925) are running, and returns active browser tabs, logged-in Google/ChatGPT accounts, and available image engines.",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "mythic_launch_server",
        description: "Auto-launches the MythicFrame server (web UI & BEI bridge on port 3488 and 58925) if it is currently offline.",
        inputSchema: {
          type: "object",
          properties: {
            port: { type: "number", description: "Port number (default 3488)" }
          },
          required: []
        }
      },
      {
        name: "mythic_open_tab",
        description: "Opens or focuses a Google Gemini or ChatGPT tab in Chrome via BEI so the user can log in with their browser account.",
        inputSchema: {
          type: "object",
          properties: {
            target: { type: "string", enum: ["gemini", "chatgpt"], description: "Browser target (default 'gemini')" },
            accountSlot: { type: "number", description: "Account slot (default 0)" }
          },
          required: []
        }
      },
      {
        name: "mythic_bei_generate",
        description: "Generates an image via the Browser Extension Interface (BEI) using active Google Gemini or ChatGPT browser sessions with ZERO API key required.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "Image generation prompt" },
            aspectRatio: { type: "string", description: "'1:1', '16:9', '9:16', '3:4', or '4:3' (default '1:1')" },
            target: { type: "string", enum: ["gemini", "chatgpt"], description: "AI service target (default 'gemini')" },
            accountSlot: { type: "number", description: "Account slot index (default 0)" },
            images: { type: "array", items: { type: "string" }, description: "Array of reference image paths or base64 data URIs" },
            style: { type: "string", description: "Optional art style snippet" },
            timeoutSeconds: { type: "number", description: "Timeout in seconds (default 120)" }
          },
          required: ["prompt"]
        }
      },
      {
        name: "mythic_smart_generate",
        description: "Unified generator for MythicFrame that intelligently discovers and routes to the best available engine (BEI browser extension or Gemini API key).",
        inputSchema: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "Image generation prompt" },
            engine: { type: "string", enum: ["auto", "bei", "gemini-api", "prompt-only"], description: "Engine route (default 'auto')" },
            geminiApiKey: { type: "string", description: "Optional Gemini API key if using gemini-api route" },
            aspectRatio: { type: "string", description: "'1:1', '16:9', '9:16', '3:4', '4:3'" },
            style: { type: "string", description: "Art style snippet" },
            images: { type: "array", items: { type: "string" }, description: "Optional reference images" },
            target: { type: "string", enum: ["gemini", "chatgpt"] },
            accountSlot: { type: "number" }
          },
          required: ["prompt"]
        }
      },
      {
        name: "launch_web_ui",
        description: "Manually launches the MythicFrame web UI on localhost port 3488 if the auto-launch failed.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const args = request.params.arguments as any;
    const name = request.params.name;
    
    let result = "";
    let isImageGen = true;
    let aspectRatio = "1:1";

    if (name === "prepare_illustration_prompt") {
      let bgMode: any = args.backgroundMode || "transparent";
      if (bgMode === "AI Decides" || bgMode === "scene") bgMode = "scene";
      const bgConfig: BackgroundConfig = { 
          mode: bgMode,
          color: args.backgroundColor 
      } as any;

      const chibiConfig = args.chibiMode ? ({ headSize: 2.0, bodyPlumpness: 1.5, limbStubbiness: 0.8, enableSparkles: false } as any) : undefined;
      
      let mappedChibiProportion: any = undefined;
      if (args.chibiMode && args.chibiRatio) {
          if (args.chibiRatio === "1:1") mappedChibiProportion = "micro_2h";
          if (args.chibiRatio === "1:2") mappedChibiProportion = "chibi_3h";
          if (args.chibiRatio === "1:4") mappedChibiProportion = "deformed_4h";
      } else if (args.chibiMode) {
          mappedChibiProportion = "chibi_3h"; // default 1:2
      }

      const built = buildIllustrationPrompt(
          args.prompt, defaultGameContext, args.style || "", bgConfig, [], undefined, undefined, mappedChibiProportion, chibiConfig, args.viewpoint, args.noCharacters, args.framing as any
      );
      result = built.textPrompt;
      aspectRatio = args.aspectRatio || "1:1";
    }

    else if (name === "batch_studio_generate") {
      const subjects: string[] = args.subjects || [];
      const variations: string[] = args.variations || [];
      
      let bgMode: any = args.backgroundMode || "transparent";
      if (bgMode === "AI Decides" || bgMode === "scene") bgMode = "scene";
      const bgConfig: BackgroundConfig = { 
          mode: bgMode,
          color: args.backgroundColor 
      } as any;

      const outDir = path.join(process.cwd(), "outputs", "batch");
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

      let resultsLog = `BATCH GENERATION COMPLETE!\n\n`;

      for (const subject of subjects) {
          for (const variation of variations) {
              const isChibi = variation.toLowerCase() === "chibi";
              let mappedChibiProportion: any = undefined;
              let chibiConfig: any = undefined;
              
              if (isChibi) {
                  chibiConfig = { headSize: 2.0, bodyPlumpness: 1.5, limbStubbiness: 0.8, enableSparkles: false };
                  if (args.chibiRatio === "1:1") mappedChibiProportion = "micro_2h";
                  else if (args.chibiRatio === "1:4") mappedChibiProportion = "deformed_4h";
                  else mappedChibiProportion = "chibi_3h";
              }

              let framing: any = undefined;
              if (variation.toLowerCase() === "full-body" || variation.toLowerCase() === "full body") framing = "full-body";
              if (variation.toLowerCase() === "waist-up" || variation.toLowerCase() === "waist up") framing = "waist-up";

              const built = buildIllustrationPrompt(
                  subject, defaultGameContext, args.style || "", bgConfig, [], undefined, undefined, mappedChibiProportion, chibiConfig, undefined, false, framing
              );
              
              const promptStr = built.textPrompt;
              const ratio = args.aspectRatio || "1:1";
              
              let width = 1024;
              let height = 1024;
              if (ratio === "16:9") { height = 576; }
              if (ratio === "9:16") { width = 576; }
              if (ratio === "3:4") { width = 768; height = 1024; }
              if (ratio === "4:3") { width = 1024; height = 768; }

              const encodedPrompt = encodeURIComponent(promptStr);
              const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&enhance=false`;

              const cleanSubject = subject.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
              const fileName = `batch_${cleanSubject}_${variation}_${Date.now()}.jpg`;
              const filePath = path.join(outDir, fileName);

              try {
                  const response = await fetch(url);
                  const arrayBuffer = await response.arrayBuffer();
                  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
                  resultsLog += `[SUCCESS] ${subject} (${variation}) -> [link](file:///${filePath.replace(/\\/g, '/')})\n`;
              } catch (e: any) {
                  resultsLog += `[FAILED] ${subject} (${variation}) -> ${e.message}\n`;
              }
          }
      }

      return { content: [{ type: "text", text: resultsLog }] };
    } 
    else if (name === "mythic_status") {
      const status = await checkMythicStatus();
      const accountsList = status.accounts && status.accounts.length > 0
        ? status.accounts.map(a => `• Slot ${a.slot}: ${a.email || 'Google Account'}`).join('\n')
        : '• No accounts discovered yet in Chrome';
      const tabsList = status.tabs && status.tabs.length > 0
        ? status.tabs.map(t => `• Tab #${t.tabId} (${t.target}): ${t.title || t.url} [${t.email || 'Active'}]`).join('\n')
        : '• No active Gemini/ChatGPT tabs open in Chrome';

      const responseText = 
        `⚡ MYTHICFRAME ENGINE STATUS\n\n` +
        `Web Server: ${status.serverRunning ? `ONLINE (http://localhost:3488)` : `OFFLINE (use 'mythic_launch_server')`}\n` +
        `BEI Extension Bridge: ${status.bridgeRunning ? `ONLINE (Port ${status.bridgePort})` : `OFFLINE`}\n` +
        `BEI Extension Client: ${status.beiConnected ? `CONNECTED` : `NOT CONNECTED (open Chrome tab with extension)`}\n` +
        `Gemini API Key: ${status.hasGeminiApiKey ? `CONFIGURED` : `NOT CONFIGURED (optional with BEI)`}\n` +
        `Available Generation Engines: ${status.availableEngines.join(', ')}\n\n` +
        `Discovered Accounts:\n${accountsList}\n\n` +
        `Discovered Tabs:\n${tabsList}\n\n` +
        `Summary: ${status.summary}`;

      return { content: [{ type: "text", text: responseText }] };
    }
    else if (name === "mythic_launch_server") {
      const res = await launchMythicServer();
      return { content: [{ type: "text", text: res.message }] };
    }
    else if (name === "mythic_open_tab") {
      const target = args.target || 'gemini';
      const slot = args.accountSlot ?? 0;
      const res = await openBEITab(target, slot);
      return { content: [{ type: "text", text: res.message }] };
    }
    else if (name === "mythic_bei_generate") {
      let promptToSend = args.prompt;
      if (args.style) {
        const built = buildIllustrationPrompt(args.prompt, defaultGameContext, args.style, defaultBgConfig, []);
        promptToSend = built.textPrompt;
      }
      const beiRes = await generateWithBEI({
        prompt: promptToSend,
        aspectRatio: args.aspectRatio || '1:1',
        target: args.target || 'gemini',
        accountSlot: args.accountSlot ?? 0,
        images: args.images || [],
        timeoutSeconds: args.timeoutSeconds || 900
      });
      const formattedPath = beiRes.filePath.replace(/\\/g, '/');
      const fileName = path.basename(beiRes.filePath);
      return {
        content: [{
          type: "text",
          text: `IMAGE GENERATED SUCCESSFULLY VIA BEI!\n\nImage saved to: ${beiRes.filePath}\nJob ID: ${beiRes.jobId}\n\nPlease embed this image for the user, AND provide a clickable markdown link [${fileName}](file:///${formattedPath}) so they can easily open it!`
        }]
      };
    }
    else if (name === "mythic_smart_generate") {
      const engineChoice = args.engine || 'auto';
      let promptToSend = args.prompt;
      if (args.style) {
        const built = buildIllustrationPrompt(args.prompt, defaultGameContext, args.style, defaultBgConfig, []);
        promptToSend = built.textPrompt;
      }

      if (engineChoice === 'prompt-only') {
        return { content: [{ type: "text", text: formatTextInstruction(promptToSend) }] };
      }

      if (engineChoice === 'bei') {
        const beiRes = await generateWithBEI({
          prompt: promptToSend,
          aspectRatio: args.aspectRatio || '1:1',
          target: args.target || 'gemini',
          accountSlot: args.accountSlot ?? 0,
          images: args.images || []
        });
        const formattedPath = beiRes.filePath.replace(/\\/g, '/');
        const fileName = path.basename(beiRes.filePath);
        return {
          content: [{
            type: "text",
            text: `IMAGE GENERATED SUCCESSFULLY VIA BEI!\n\nImage saved to: ${beiRes.filePath}\n\nPlease embed this image for the user, AND provide a clickable markdown link [${fileName}](file:///${formattedPath}) so they can easily open it!`
          }]
        };
      }

      if (engineChoice === 'gemini-api') {
        const resText = await executeImageGeneration(promptToSend, args.aspectRatio || '1:1', 'mythic_smart', args.geminiApiKey);
        return { content: [{ type: "text", text: resText }] };
      }

      // Auto routing: probe status
      const status = await checkMythicStatus();
      if (status.beiConnected && status.tabs.some(t => t.target === 'gemini' || t.target === 'chatgpt')) {
        const beiRes = await generateWithBEI({
          prompt: promptToSend,
          aspectRatio: args.aspectRatio || '1:1',
          target: args.target || 'gemini',
          accountSlot: args.accountSlot ?? 0,
          images: args.images || []
        });
        const formattedPath = beiRes.filePath.replace(/\\/g, '/');
        const fileName = path.basename(beiRes.filePath);
        return {
          content: [{
            type: "text",
            text: `IMAGE GENERATED SUCCESSFULLY VIA BEI!\n\nImage saved to: ${beiRes.filePath}\n\nPlease embed this image for the user, AND provide a clickable markdown link [${fileName}](file:///${formattedPath}) so they can easily open it!`
          }]
        };
      }

      if (args.geminiApiKey || status.hasGeminiApiKey) {
        const resText = await executeImageGeneration(promptToSend, args.aspectRatio || '1:1', 'mythic_smart', args.geminiApiKey);
        return { content: [{ type: "text", text: resText }] };
      }

      // Neither engine ready: return structured diagnostic message
      return {
        content: [{
          type: "text",
          text: `CANNOT GENERATE: NO ENGINE READY\n\n` +
                `Status summary:\n${status.summary}\n\n` +
                `Options to proceed:\n` +
                `1. Zero-Key BEI Route: Run 'mythic_launch_server', then open Chrome and log in at gemini.google.com.\n` +
                `2. Gemini API Route: Provide 'geminiApiKey' or set it in .env.local.\n` +
                `3. Prompt-only: Pass engine: 'prompt-only' to view the optimized generation prompt.`
        }],
        isError: true
      };
    }
    else if (name === "launch_web_ui") {
      const res = await launchMythicServer();
      return { content: [{ type: "text", text: res.message }] };
    }
    else if (name === "prepare_ui_reimagine_prompt") {
      result = buildUIReimaginePrompt(args.prompt, defaultGameContext, args.styleSnippet || "", true, args.uiMood, undefined, undefined, args.uiArchetype, args.uiMaterial, false);
      aspectRatio = args.aspectRatio || "16:9";
    }
    else if (name === "prepare_clothes_prompt") {
      const built = buildClothesPrompt(args.prompt, defaultGameContext, args.styleSnippet || "", defaultBgConfig, []);
      result = built.textPrompt;
    }
    else if (name === "prepare_map_grid_prompt") {
      const mapConfig: MapGridConfig = {
          enabled: true, viewMode: args.viewMode || 'isometric', preset: 'custom',
          gridWidth: 10, gridHeight: 10, cellSize: 64, primaryColor: args.primaryColor || '#4CAF50',
          accentColor: '#388E3C', shadowIntensity: 50, lightDirection: 'top-left', detailDensity: 'medium', decorationLevel: 'medium', transparentBackground: true
      } as any;
      result = buildMapGridPrompt(args.prompt, defaultGameContext, args.styleSnippet || "", mapConfig);
      aspectRatio = "16:9";
    }
    else if (name === "prepare_pose_studio_prompt") {
      // Mock pose data to trigger the pose instructions
      const mockPose: PoseData = { joints: [{ name: "head", x: 50, y: 20 }, { name: "chest", x: 50, y: 40 }] } as any;
      const built = buildPoseStudioPrompt(args.prompt, defaultGameContext, args.styleSnippet || "", defaultBgConfig, [], mockPose);
      result = built.textPrompt;
    }
    else if (name === "prepare_sprite_sheet_prompts") {
      result = buildSpriteSheetPromptsPrompt(args.prompt, args.frameCount, defaultGameContext);
      isImageGen = false;
    }
    else if (name === "prepare_frame_prompt") {
      result = buildFramePrompt(args.prompt, defaultGameContext, args.styleSnippet || "", args.elements);
    }
    else if (name === "prepare_background_asset_prompt") {
      result = buildBackgroundAssetPrompt(args.prompt, defaultGameContext, args.styleSnippet || "", args.patternType as any);
      aspectRatio = "16:9";
    }
    else if (name === "prepare_extract_clothes_prompt") {
      const bg: BackgroundConfig = { mode: args.backgroundMode as any || "transparent" } as any;
      result = buildExtractClothesPrompt(defaultGameContext, bg);
    }
    else if (name === "prepare_card_suggestions_prompt") {
      result = buildCardSuggestionsPrompt(args.artPrompt, args.currentName || "New Card");
      isImageGen = false;
    }
    else {
      throw new Error(`Tool not found: ${name}`);
    }

    if (isImageGen) {
        const resultText = await executeImageGeneration(result, aspectRatio, name, args.geminiApiKey);
        return { content: [{ type: "text", text: resultText }] };
    } else {
        return { content: [{ type: "text", text: formatTextInstruction(result) }] };
    }
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error processing prompt: ${error.message}` }],
      isError: true,
    };
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Mythic Advanced MCP server running on stdio");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
