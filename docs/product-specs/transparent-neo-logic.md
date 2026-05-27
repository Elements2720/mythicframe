
# Transparent NEO – Professional Background Removal

## Overview
Transparent NEO is MythicFrame's elite background removal pipeline. While the standard "Transparent" mode (v0.8.7) uses a binary flood-fill, **NEO** treats every pixel as a mix of foreground and background. This enables professional-grade results for:
- Fine hair wisps
- Translucent magical effects
- Atmospheric smoke and steam
- Glowing particle systems

## 1. The Core Equation
Digital images follow the Compositing Equation:  
`Observed Color = Alpha * Foreground + (1 - Alpha) * Background`

Standard removal systems simply throw away pixels where Alpha is likely 0. **NEO solves for Alpha and Foreground separately.**

## 2. The NEO Pipeline

### Pass 0: Background Profiling
Instead of assuming a perfect #FF00FF (Magenta), NEO samples the image boundaries. It creates a statistical model of the background color to account for compression artifacts or subtle lighting gradients introduced by the AI generator.

### Pass 1: Exterior BFS (Isolation)
Uses a perceptual distance metric in RGB space to identify the "infinite" background area. This protects internal elements that might match the background color (like magenta eyes or gems).

### Pass 2: Soft Alpha Matting (SDF)
Rather than a 1px hard edge, NEO calculates a **Signed Distance Field (SDF)** near the foreground boundary. 
- Pixels inside the subject get `Alpha = 1.0`.
- Pixels far outside get `Alpha = 0.0`.
- Boundary pixels get a soft ramp based on the `softRadius` setting.

### Pass 3: Color Decontamination (Defringing)
This is the most critical step. NEO performs **Unblending**. For pixels with fractional alpha (edges), it subtracts the background magenta component and rescales the remaining RGB to recover the "True Foreground" color.
*Result*: A semi-transparent white hair strand becomes truly white and transparent, instead of pink and opaque.

## 3. Advanced Controls

### Edge Softness
Controls the radius of the SDF ramp. 
- **Low**: Sharp, anime-style cutouts.
- **High**: Soft, photographic or painterly transitions.

### Decontam Strength
Determines how aggressively to remove the background color from edge pixels. 
- **100%**: Zero magenta fringe, but may desaturate edges of magenta-colored objects.
- **Lower**: Safer for characters with magenta hair or clothes.

### FX Glow Optimization
A specialized pass that detects high-luminance pixels. If a pixel is "Bright" but marked as background, NEO boosts its alpha slightly. This preserves magical glows and bioluminescence that would otherwise be erased.

## 4. Usage Tips
- **Character Sprites**: Use NEO with `Softness: 2.0`, `Decontam: 85%`.
- **Magic/Spell Assets**: Enable `FX Mode`, increase `Softness` to `4.0+`.
- **Intentional Magenta**: If your character has magenta features, enable **Magenta Guard** to prevent Pass 1 from eating into the character's silhouette.
