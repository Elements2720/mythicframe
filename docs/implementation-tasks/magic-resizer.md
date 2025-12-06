
# Magic Resizer (Content Aware Outpainting)

## Core Features
- [x] **Mode Infrastructure**
  - [x] Add 'resize' mode to types and constants.
  - [x] Add Sidebar navigation item.
  - [x] Add prompt template for outpainting (`buildOutpaintPrompt`).

## Canvas Interactions
- [x] **Interactive Composition**
  - [x] Drag to Pan source image within target canvas.
  - [x] Scroll to Zoom source image.
  - [x] Visual Overlay showing "Output Area".
  - [x] CSS Transform-based preview (High performance).

## Generation Pipeline
- [x] **Composite Generation**
  - [x] `createCompositeImage` utility to stitch source + black canvas.
  - [x] Handle pan/zoom offsets in composition.
  - [x] Send composite to Gemini `editImage` (Nano Banana model).

## UI/UX Controls
- [x] **Right Panel**
  - [x] Aspect Ratio selection.
  - [x] Explicit Zoom/Pan sliders (as backup/alternative).
  - [x] Reset View button.
  - [x] Empty state ("Select Source Image").
- [x] **Batch & Asset Integration**
  - [x] Batch Queue for multiple images.
  - [x] Result storage in Queue items.
  - [x] Drag & Drop batch upload.
  - [x] Download result from list.
  - [x] Reset/Retry result.

## Visual Feedback
- [x] **Before/After Comparison**
  - [x] Hold-to-compare button on canvas.
  - [x] Track original source vs generated result.

## Post-Processing
- [x] **Magic Crop**
  - [x] Crop result to Safe Zone or Custom Region.
  - [x] Integrated into Right Panel.
