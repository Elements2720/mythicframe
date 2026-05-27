# MythicFrame v0.8.7 – Transparent Background & "Healing" Logic

## Overview
As of version 0.8.7, MythicFrame implements a sophisticated client-side background removal pipeline. Unlike standard AI transparency which often produces jagged edges or "halos," our system uses a multi-pass Chroma Key approach combined with an intelligent pixel-healing algorithm.

## 1. The Prompt Phase (Chroma Keying)
When a user selects **Transparent** mode in any generation studio (Illustration, Gacha, or Clothes), the `promptTemplates.ts` logic injects a strict requirement into the system instruction:

> "IMPORTANT: Generate the asset on a SOLID MAGENTA BACKGROUND (Hex #FF00FF)."

**Why Magenta?**
Magenta (#FF00FF) is chosen as the "digital green screen" because it is rarely found in natural skin tones, standard fantasy armor, or environmental textures, minimizing "color bleed" or accidental transparency.

## 2. The Multi-Pass Processing Pipeline
Once Gemini returns the raw image, the `removeBackground` utility in `src/utils/imageUtils.ts` executes a three-pass algorithm:

### Pass 1: Exterior BFS (Flood Fill)
The system performs a **Breadth-First Search** starting from the four corners of the image. 
- It identifies all pixels matching the sampled "Key Color" (magenta) within a specific tolerance.
- Only pixels connected to the edges are marked as "Background." This prevents the centers of eyes or vibrant magical effects from being erased accidentally if they happen to be magenta-ish.

### Pass 2: Intelligent Hole Removal & Healing
This is the "Magic" step introduced in v0.8.7. AI generators often leave tiny artifacts or "specks" of the background color inside complex areas (like between strands of hair or under armor plates).
- **Hole Detection**: The system identifies "islands" of the key color that were *not* reached by the exterior flood fill.
- **Healing Power**: Based on the `healingPower` slider (0-100%):
  - **Low Power**: Keeps small internal gaps transparent (good for lace/mesh).
  - **High Power**: Fills in internal magenta specks, assuming they are digital artifacts rather than intentional holes.

### Pass 3: Edge Feathering
To avoid the "aliased" look of traditional magic wands, Pass 3 analyzes the boundary between Background and Foreground pixels.
- It applies a 1-2 pixel alpha gradient.
- It calculates a "mix" value based on how close the pixel color is to the target tolerance, resulting in smooth, professional edges suitable for game engine import.

## 3. User Controls
In the **Background Mode** settings of the Right Panel, users have two fine-tuning controls:

1.  **Remove Holes**: Toggles the Pass 2 logic. Essential for characters with complex silhouettes.
2.  **Detail Healing Power**: Adjusts the sensitivity of Pass 2. 
    - *Usage Tip*: If your character's eyes are being removed, lower the Healing Power. If there are pink dots in the hair, increase it.

## 4. Technical Constraints
- **Chroma Sensitivity**: The algorithm currently uses a fixed tolerance optimized for Gemini's output. 
- **Resolution**: Processing is done at the full resolution of the generated asset (1K, 2K, or 4K), which may cause a 1-2 second "Healing..." status delay on lower-end devices.
- **Export**: Images are exported as 32-bit PNGs with full Alpha channel support.