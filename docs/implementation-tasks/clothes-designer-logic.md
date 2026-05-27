
# Clothes Designer – Technical Implementation

## 1. Character Swap Logic (On-Model)
The goal is to change the outfit of an existing character while maintaining 100% facial and anatomical consistency.

### Reference Configuration
- **Part 1 (Base Character)**: Sent as a `ReferenceAsset` with the role "Mannequin".
- **Part 2 (Target Style/Outfit)**: (Optional) Sent as a secondary "Style Source" if a specific reference outfit is provided.

### Prompt Strategy
```text
[STRICT POSE & IDENTITY LOCK]
1. CONSTANTS: You MUST preserve the face, skin color, and hair of Reference 1.
2. ACTION: Erase all existing clothing from Reference 1.
3. SYNTHESIS: Render the subject wearing [USER_CLOTHES_DESCRIPTION]. 
4. ADHERENCE: The new clothes must follow the lighting and 3D volume of the original character's body.
```

## 2. Garment Extraction Logic (Asset-Only)
The goal is to generate clothing as a standalone game asset (PNG with transparency) without a human inside.

### The "Ghost Mannequin" Algorithm
1. **Prompt Injection**: Injects `[ZERO BIOLOGICAL MATTER]` and `[HOLLOW VOLUME]`.
2. **Instruction**: "Render the outfit as if worn by an invisible void. Do not show skin at the collar, cuffs, or waist."
3. **NEO Integration**:
   - The asset is generated on a Magenta (#FF00FF) backdrop.
   - `removeBackgroundNeo` is called with `tolEdge: 45` and `steamSafe: true` to ensure delicate fabrics (capes, silk) remain soft but clean.

## 3. Workflow States
- **State: Draft**: Generating a new outfit on a character.
- **State: Extract**: Taking an existing character and programmatically removing them to leave only the clothes.
- **State: Fit**: Taking a standalone garment asset and applying it to a different character mannequin.
