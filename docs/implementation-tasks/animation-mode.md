# Animation Mode Tasks

## Core Functionality
- [x] **Data Model**
  - [x] Define `AnimationFrame` and `AnimationProject` types
  - [x] Add `animation` to `UIMode`
- [x] **Timeline UI**
  - [x] Horizontal scrollable strip of frames
  - [x] Add/Delete/Duplicate frame controls
  - [x] Frame selection logic
  - [x] Per-frame prompt input
- [x] **Generation**
  - [x] Single frame generation using Gemini
  - [x] Support for "Illustration" (Character) and "Background" modes within animation
  - [x] **Style Consistency**: Pass global style settings to frame generation
- [x] **Playback**
  - [x] FPS control (1-12 fps)
  - [x] Play/Pause loop logic
  - [x] Canvas overlay for playback status

## Integration
- [x] **Right Panel**
  - [x] Show appropriate config (Background Pattern vs Illustration Config) based on animation type
  - [x] FPS Slider
- [x] **Export**
  - [x] Export frames as individual PNGs in ZIP
  - [x] Include animation metadata (FPS, Type) in JSON export
