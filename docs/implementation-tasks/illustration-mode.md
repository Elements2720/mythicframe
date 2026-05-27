# Illustration Mode Tasks

## Core Functionality
- [x] Character Mode and Scene Mode
- [x] Drag-resizable canvas with live pixel dimensions
- [x] Editable width/height fields synced with drag
- [x] Background complexity controls (simple/heavy/solid color)
- [x] Theme color + “no color” option
- [x] **Game Context**: Inject project setting/tone into prompts automatically
- [x] Batch/multi reference images with per-image roles
- [x] “Match reference size” option

## Gemini Integration
- [x] Style profiling using multiple references
- [x] Illustration generation using prompts + references
- [x] **Context-Aware Prompts**: Ensure Game Context is respected in generation
- [x] Cancelable generation (AbortSignal support)

## UI/UX Refinement
- [x] **Refactor**: Extract Canvas and Prompt components
- [x] Resizable prompt area (Splitter/Drag handle)
- [x] Adaptive preview area (Flex layout)
- [x] Larger rounded reference thumbnails in bottom panel
- [x] Smooth drag for selection and resizing
- [x] Responsive layout
- [x] **Debug Console**: View full prompts sent to API
- [x] **Camera Viewpoint**: Select perspective (Top-down, Isometric, etc.)

## Export & History
- [x] Single image export
- [x] ZIP export (images + metadata)
- [x] Prompt-only export
- [ ] History entries for each generation