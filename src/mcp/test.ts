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

const defaultGameContext: GameContext = { setting: "Cyberpunk", tone: "Gritty", visualConstraints: "" };
const defaultBgConfig: BackgroundConfig = { mode: "transparent", color: "#000", allowTransparency: true, promptFragment: "" };

async function runTests() {
  console.log("Starting MythicFrame MCP Readiness Tests...\n");
  let passed = 0;
  let failed = 0;

  const runTest = (name: string, testFn: () => void) => {
    try {
      testFn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (e: any) {
      console.error(`❌ [FAIL] ${name}: ${e.message}`);
      failed++;
    }
  };

  runTest("buildIllustrationPrompt", () => {
    const res = buildIllustrationPrompt("A knight", defaultGameContext, "Pixel Art", defaultBgConfig, []);
    if (!res.textPrompt.includes("A knight") || !res.textPrompt.includes("Pixel Art")) throw new Error("Missing content");
  });

  runTest("buildUIReimaginePrompt", () => {
    const res = buildUIReimaginePrompt("Inventory Screen", defaultGameContext, "Clean", true);
    if (!res.includes("Inventory Screen") || !res.includes("UI DESIGN")) throw new Error("Missing content");
  });

  runTest("buildClothesPrompt", () => {
    const res = buildClothesPrompt("Red Jacket", defaultGameContext, "Anime", defaultBgConfig, []);
    if (!res.textPrompt.includes("CLOTHES DESIGN")) throw new Error("Missing content");
  });

  runTest("buildMapGridPrompt", () => {
    const mapConfig: MapGridConfig = {
      viewMode: 'isometric', preset: 'custom',
      gridWidth: 10, gridHeight: 10, cellSize: 64, primaryColor: '#000',
      accentColor: '#000', shadowIntensity: 50, lightDirection: 'top-left', detailDensity: 'medium', decorationLevel: 'rich', transparentBackground: true
    } as any;
    const res = buildMapGridPrompt("Forest level", defaultGameContext, "Voxel", mapConfig);
    if (!res.includes("MAP GRID GENERATION TASK")) throw new Error("Missing content");
  });

  runTest("buildPoseStudioPrompt", () => {
    const mockPose: PoseData = { joints: [{ id: "joint-1", name: "head", x: 50, y: 20 }], showSkeleton: true };
    const res = buildPoseStudioPrompt("A running rogue", defaultGameContext, "Realistic", defaultBgConfig, [], mockPose);
    if (!res.textPrompt.includes("POSE-DRIVEN CHARACTER GENERATION") || !res.textPrompt.includes("head")) throw new Error("Missing content");
  });

  runTest("buildSpriteSheetPromptsPrompt", () => {
    const res = buildSpriteSheetPromptsPrompt("A jumping wizard", 4, defaultGameContext);
    if (!res.includes("sequence of 4 distinct character poses")) throw new Error("Missing content");
  });

  runTest("buildFramePrompt", () => {
    const res = buildFramePrompt("Metal frame", defaultGameContext, "Rusty", ["name_banner" as any, "mana_cost" as any]);
    if (!res.includes("name_banner") || !res.includes("mana_cost")) throw new Error("Missing content");
  });

  runTest("buildBackgroundAssetPrompt", () => {
    const res = buildBackgroundAssetPrompt("Starry sky", defaultGameContext, "Watercolor", "texture");
    if (!res.includes("Starry sky") || !res.includes("texture")) throw new Error("Missing content");
  });

  runTest("buildExtractClothesPrompt", () => {
    const bg: BackgroundConfig = { mode: "solid", color: "#FF0000", allowTransparency: false, promptFragment: "" };
    const res = buildExtractClothesPrompt(defaultGameContext, bg);
    if (!res.includes("EXTRACTION TASK") || !res.includes("#FF0000")) throw new Error("Missing content");
  });

  runTest("buildCardSuggestionsPrompt", () => {
    const res = buildCardSuggestionsPrompt("A fiery sword", "Flame Blade");
    if (!res.includes("fiery sword") || !res.includes("Flame Blade")) throw new Error("Missing content");
  });

  console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("🚀 MythicFrame MCP Server is fully ready and usable!");
  }
}

runTests();
