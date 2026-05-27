import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { buildIllustrationPrompt, buildUIReimaginePrompt, buildClothesPrompt, buildMapGridPrompt, buildPoseStudioPrompt, buildSpriteSheetPromptsPrompt, buildFramePrompt, buildBackgroundAssetPrompt, buildExtractClothesPrompt, buildCardSuggestionsPrompt } from "../services/promptTemplates.js";
const server = new Server({
    name: "mythic-advanced-mcp",
    version: "2.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
import fs from "fs";
import path from "path";
// Helper to format output instructions for image generation
const executeImageGeneration = async (promptStr, aspectRatio = "1:1", toolName) => {
    let width = 1024;
    let height = 1024;
    if (aspectRatio === "16:9") {
        height = 576;
    }
    if (aspectRatio === "9:16") {
        width = 576;
    }
    if (aspectRatio === "3:4") {
        width = 768;
        height = 1024;
    }
    if (aspectRatio === "4:3") {
        width = 1024;
        height = 768;
    }
    const encodedPrompt = encodeURIComponent(promptStr);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&enhance=false`;
    const outDir = path.join(process.cwd(), "outputs");
    if (!fs.existsSync(outDir))
        fs.mkdirSync(outDir, { recursive: true });
    const fileName = `${toolName}_${Date.now()}.jpg`;
    const filePath = path.join(outDir, fileName);
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
        return `IMAGE GENERATED SUCCESSFULLY!\n\nAgent, the image has been generated using the free API and saved here: ${filePath}\n\nPlease embed this image for the user, AND provide a clickable markdown link [filename](file:///${filePath.replace(/\\/g, '/')}) so they can easily open it!`;
    }
    catch (e) {
        throw new Error(`Failed to download free API image: ${e.message}`);
    }
};
// Helper to format output instructions for text generation
const formatTextInstruction = (promptStr) => {
    return `PROMPT OPTIMIZED SUCCESSFULLY!\n\nAGENT INSTRUCTION: Now, use your internal LLM reasoning to directly answer the user using the following prompt.\n\n---START PROMPT---\n${promptStr}\n---END PROMPT---`;
};
// Default empty structures to prevent null errors
const defaultGameContext = { setting: "High Fantasy", tone: "Epic" };
const defaultBgConfig = { mode: "transparent" };
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "prepare_illustration_prompt",
                description: "Prepares a highly optimized illustration or character prompt using MythicFrame rules.",
                inputSchema: {
                    type: "object",
                    properties: {
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
                name: "launch_web_ui",
                description: "Manually launches the MythicFrame web UI on localhost port 5777 if the auto-launch failed.",
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
        const args = request.params.arguments;
        const name = request.params.name;
        let result = "";
        let isImageGen = true;
        let aspectRatio = "1:1";
        if (name === "prepare_illustration_prompt") {
            let bgMode = args.backgroundMode || "transparent";
            if (bgMode === "AI Decides" || bgMode === "scene")
                bgMode = "scene";
            const bgConfig = {
                mode: bgMode,
                color: args.backgroundColor
            };
            const chibiConfig = args.chibiMode ? { headSize: 2.0, bodyPlumpness: 1.5, limbStubbiness: 0.8, enableSparkles: false } : undefined;
            let mappedChibiProportion = undefined;
            if (args.chibiMode && args.chibiRatio) {
                if (args.chibiRatio === "1:1")
                    mappedChibiProportion = "micro_2h";
                if (args.chibiRatio === "1:2")
                    mappedChibiProportion = "chibi_3h";
                if (args.chibiRatio === "1:4")
                    mappedChibiProportion = "deformed_4h";
            }
            else if (args.chibiMode) {
                mappedChibiProportion = "chibi_3h"; // default 1:2
            }
            const built = buildIllustrationPrompt(args.prompt, defaultGameContext, args.style || "", bgConfig, [], undefined, undefined, mappedChibiProportion, chibiConfig, args.viewpoint, args.noCharacters, args.framing);
            result = built.textPrompt;
            aspectRatio = args.aspectRatio || "1:1";
        }
        else if (name === "batch_studio_generate") {
            const subjects = args.subjects || [];
            const variations = args.variations || [];
            let bgMode = args.backgroundMode || "transparent";
            if (bgMode === "AI Decides" || bgMode === "scene")
                bgMode = "scene";
            const bgConfig = {
                mode: bgMode,
                color: args.backgroundColor
            };
            const outDir = path.join(process.cwd(), "outputs", "batch");
            if (!fs.existsSync(outDir))
                fs.mkdirSync(outDir, { recursive: true });
            let resultsLog = `BATCH GENERATION COMPLETE!\n\n`;
            for (const subject of subjects) {
                for (const variation of variations) {
                    const isChibi = variation.toLowerCase() === "chibi";
                    let mappedChibiProportion = undefined;
                    let chibiConfig = undefined;
                    if (isChibi) {
                        chibiConfig = { headSize: 2.0, bodyPlumpness: 1.5, limbStubbiness: 0.8, enableSparkles: false };
                        if (args.chibiRatio === "1:1")
                            mappedChibiProportion = "micro_2h";
                        else if (args.chibiRatio === "1:4")
                            mappedChibiProportion = "deformed_4h";
                        else
                            mappedChibiProportion = "chibi_3h";
                    }
                    let framing = undefined;
                    if (variation.toLowerCase() === "full-body" || variation.toLowerCase() === "full body")
                        framing = "full-body";
                    if (variation.toLowerCase() === "waist-up" || variation.toLowerCase() === "waist up")
                        framing = "waist-up";
                    const built = buildIllustrationPrompt(subject, defaultGameContext, args.style || "", bgConfig, [], undefined, undefined, mappedChibiProportion, chibiConfig, undefined, false, framing);
                    const promptStr = built.textPrompt;
                    const ratio = args.aspectRatio || "1:1";
                    let width = 1024;
                    let height = 1024;
                    if (ratio === "16:9") {
                        height = 576;
                    }
                    if (ratio === "9:16") {
                        width = 576;
                    }
                    if (ratio === "3:4") {
                        width = 768;
                        height = 1024;
                    }
                    if (ratio === "4:3") {
                        width = 1024;
                        height = 768;
                    }
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
                    }
                    catch (e) {
                        resultsLog += `[FAILED] ${subject} (${variation}) -> ${e.message}\n`;
                    }
                }
            }
            return { content: [{ type: "text", text: resultsLog }] };
        }
        else if (name === "launch_web_ui") {
            try {
                const projectRoot = "d:\\\\GeminiWeb\\\\mythicframe";
                const devServer = spawn("cmd.exe", ["/c", "start", "/MIN", "npm.cmd", "run", "dev", "--", "--port", "5777"], {
                    cwd: projectRoot,
                    detached: true,
                    stdio: "ignore",
                    windowsHide: false,
                    env: { ...process.env, NODE_ENV: "development" }
                });
                devServer.unref();
                return { content: [{ type: "text", text: "Successfully launched MythicFrame localhost on port 5777!" }] };
            }
            catch (e) {
                throw new Error(`Failed to launch localhost: ${e.message}`);
            }
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
            const mapConfig = {
                enabled: true, viewMode: args.viewMode || 'isometric', preset: 'custom',
                gridWidth: 10, gridHeight: 10, cellSize: 64, primaryColor: args.primaryColor || '#4CAF50',
                accentColor: '#388E3C', shadowIntensity: 50, lightDirection: 'top-left', detailDensity: 'medium', decorationLevel: 'medium', transparentBackground: true
            };
            result = buildMapGridPrompt(args.prompt, defaultGameContext, args.styleSnippet || "", mapConfig);
            aspectRatio = "16:9";
        }
        else if (name === "prepare_pose_studio_prompt") {
            // Mock pose data to trigger the pose instructions
            const mockPose = { joints: [{ name: "head", x: 50, y: 20 }, { name: "chest", x: 50, y: 40 }] };
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
            result = buildBackgroundAssetPrompt(args.prompt, defaultGameContext, args.styleSnippet || "", args.patternType);
            aspectRatio = "16:9";
        }
        else if (name === "prepare_extract_clothes_prompt") {
            const bg = { mode: args.backgroundMode || "transparent" };
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
            const resultText = await executeImageGeneration(result, aspectRatio, name);
            return { content: [{ type: "text", text: resultText }] };
        }
        else {
            return { content: [{ type: "text", text: formatTextInstruction(result) }] };
        }
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error processing prompt: ${error.message}` }],
            isError: true,
        };
    }
});
import { spawn } from "child_process";
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Mythic Advanced MCP server running on stdio");
}
run().catch((error) => {
    console.error(error);
    process.exit(1);
});
