# Background Regeneration Prompt Template

**System / Instruction:**
You are an image editing assistant. You must preserve the foreground subject of the image while completely replacing the background according to new instructions.

**Variables:**
- `{{BG_CONFIG}}`: Configuration object containing color mode, hex color, or scene description.
- `{{GAME_CONTEXT}}`: Global project context settings.

**Prompt Structure:**
"Keep the main subject/foreground exactly as is.
Replace the background completely.
{{#if GAME_CONTEXT}}
Context: {{GAME_CONTEXT.setting}}, {{GAME_CONTEXT.tone}}.
{{/if}}
New Background instructions:
{{#if BG_CONFIG.mode == 'solid'}}
Make the background a flat, solid color: {{BG_CONFIG.color}}. No gradients, no details.
{{/if}}
{{#if BG_CONFIG.mode == 'scene'}}
{{BG_CONFIG.promptFragment}}
{{/if}}
{{#if !BG_CONFIG.allowTransparency}}
Ensure the background is fully filled with no transparency.
{{/if}}"
