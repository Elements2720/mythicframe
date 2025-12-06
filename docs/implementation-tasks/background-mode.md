# Background Mode Tasks

## Core Functionality
- [x] **Pattern Selection**:
  - [x] Scenes (Environmental, depth)
  - [x] Textures (Surfaces, materials, seamless-style)
  - [x] Abstract (Geometric, gradients, magical)
  - [x] UI Backdrop (Clean, dark, suitable for menus)
- [x] **Prompt Construction**:
  - [x] Specialized prompt builder for background generation
  - [x] Integration with Game Context (Setting/Tone)
- [x] **UI Integration**:
  - [x] Right Panel controls for Pattern Type
  - [x] Prompt Panel placeholder updates

## Gemini Integration
- [x] Wire up `generateIllustration` to use `buildBackgroundPrompt` when in Background Mode
- [x] Ensure aspect ratio respect for background generation (often 16:9)

## UX Refinement
- [x] Preview placeholder scales to selected aspect ratio