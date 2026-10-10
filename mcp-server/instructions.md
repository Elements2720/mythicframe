# MythicFrame Generative Engine & MCP Tool Suite

MythicFrame provides game developers with dedicated AI asset synthesis pipelines powered by two engines:
1. **BEI (Browser Extension Interface)**: Zero API key required! Bridges directly to active Google Gemini or ChatGPT sessions in Chrome.
2. **Gemini Imagen API**: Direct API calls using a Gemini API key.

---

## 1. MANDATORY CHAT REPORTING PROTOCOL
Whenever you generate or prepare assets for the user, you MUST report the exact MCP tools and parameters used to construct the prompt and image in your chat response.
Format example:
```markdown
### MCP Pipeline Execution:
- **Prompt Tools Used**: `prepare_illustration_prompt`
  - `style`: 'arknights_tactical'
  - `viewpoint`: 'three-quarter'
  - `framing`: 'full-body'
  - `characterPose`: 'standing heroic with greatsword'
  - `lookTarget`: 'at camera'
  - `chibiMode`: false
- **Generation Tool**: `mythic_bei_generate` (Engine: BEI, Slot: 0, Quality: 'ultra_original', Aspect Ratio: '1:1')
```
*Rationale: This ensures total transparency so the user can instruct you to change, toggle, or bypass any tool or constraint.*

---

## 2. Modes & Tool Guide: When to Use Each Parameter

### A. Character Suppression vs Character Assets
- **`noCharacters: true`**:
  - **When to use**: Environments, landscapes, props, inventory icons, dungeon maps, furniture, backgrounds, and UI scenes.
  - **Why**: Generative models naturally bias toward inserting characters into scenes. Setting `noCharacters: true` enforces a strict negative constraint (`NO PEOPLE. NO CHARACTERS. NO CREATURES. NO ANIMALS. NO HUMANOIDS.`) guaranteeing an empty scene or standalone prop.
- **`biologicalEraser: true`** (or `renderMode: 'asset'` in `prepare_clothes_prompt`):
  - **When to use**: Standalone clothing items, armor sets, robes, wearable equipment, or 3D fashion assets without a mannequin or model.
  - **Why**: Completely erases biological matter (skin, eyes, face, hair, hands, neck), rendering a hollow 3D ghost outfit floating in space.

### B. Proportions & Chibi Modes
- **`chibiMode: true`**:
  - Automatically rewires character proportions, simplifying muscle anatomy, rounding limbs, and enlarging expressive facial features.
  - **`chibiRatio` selection**:
    - `'1:1'` (`micro_2h`): Extreme 2-head nendoroid proportion (head equals body height). Ideal for 16x16 micro-sprites and stickers.
    - `'1:2'` (`chibi_3h`): Standard gacha chibi (head is ~33% of height, 3-head proportion). The industry standard for mobile gacha battle sprites.
    - `'1:4'` (`deformed_4h`): Stylized super-deformed / puchi proportion (head is ~25% of height).

### C. Character Helper (Pose, Gaze, and Expression)
- **`characterPose`**: Use when the character needs a specific action (e.g. `'ready stance with dual daggers'`, `'sitting relaxed on stone throne'`, `'casting lightning spell'`).
- **`lookTarget`**: Controls eye and head direction:
  - `'at camera / direct gaze'`: Intimate, breaking the fourth wall, standard for dialogue portraits and splash art.
  - `'looking away'`: Contemplative, candid, dramatic.
  - `'looking up'` / `'looking down'`: High drama, combat, or perspective alignment.
- **`expression`**: Facial emotion (e.g. `'stoic'`, `'gentle smile'`, `'fierce battle grin'`, `'mysterious smirk'`).

### D. Camera Viewpoints & Framing
- **`viewpoint`**:
  - `'front'`: Neutral orthographic front view (ideal for sprite turnarounds and 3D modeling reference).
  - `'three-quarter'`: Dynamic 3/4 angle (standard for game dialogue avatars and splash art).
  - `'side'`: Profile view (ideal for 2D platformer walk cycles).
  - `'back'`: Rear view (over-the-shoulder or back sprite).
  - `'top-down'`: True 90-degree aerial/bird's-eye view for map tiles and tactical games.
  - `'isometric'`: 45-degree angle with axonometric projection for classic RPG/strategy levels.
  - `'high-angle'` / `'low-angle'`: Cinematic tension and scale.
- **`framing`**:
  - `'full-body'`: Entire character visible from head to toe.
  - `'waist-up'`: Cropped at the hips (standard for Visual Novel and RPG dialogue boxes).
  - `'bust'`: Cropped at chest/shoulders.
  - `'head-only'`: Close-up face/avatar for mini-maps and status icons.

### E. Deterministic Seed & Background Control
- **`seed`**: Integer for repeatable generation.
- **`backgroundMode`**:
  - `'transparent'`: Renders on pure solid white (#FFFFFF) background for effortless alpha keying / cutout.
  - `'solid'`: Flat color defined by `backgroundColor`.
  - `'scene'`: Full environmental background.

---

## 3. Style Library Management
MythicFrame includes 45+ built-in art styles plus project-specific custom styles stored in `mythic_project.json`:
- **`mythic_list_art_styles`**: View all available styles with their prompt anchors and categories (`Game Art`, `Anime/Manga`, `Retro`, `Traditional`, `Abstract/UI`, `Digital Painting`).
- **`mythic_apply_art_style`**: Activates a style ID (e.g. `'arknights_tactical'`, `'pixel_art'`, `'dark_souls'`) in `mythic_project.json`. All future prompts automatically inherit this style anchor.
- **`mythic_create_art_style`**: Define and persist a brand-new art style into `mythic_project.json` for custom game projects.

---

## 4. Execution Tools
- **`mythic_bei_generate`**: Zero-key browser bridge. Sends prompts directly to active Chrome tabs with multi-account isolation.
- **`mythic_smart_generate`**: Auto-routes between BEI and API key based on what is active.
- **`mythic_status`**: Diagnostic check of server, BEI port 58925, and active browser accounts.
