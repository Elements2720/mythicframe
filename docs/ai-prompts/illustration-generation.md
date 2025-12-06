# Illustration Generation Prompt Template

Variables:
- {{MODE}}: "character" | "scene" | "mixed"
- {{GAME_CONTEXT}}: Project narrative setting, tone, and visual constraints.
- {{USER_TAGS}}: User-provided keywords/tags.
- {{STYLE_PROMPT_SNIPPET}}: From style-profiling or selected style.
- {{BACKGROUND_COMPLEXITY}}: "simple", "heavy", or "solid_color".
- {{THEME_COLOR_MODE}}: "solid" | "scene" | "none".
- {{THEME_COLOR_HEX}}: Hex color if mode is solid.
- {{BACKGROUND_PROMPT_TEXT}}: Specific instructions for background.
- {{ALLOW_TRANSPARENCY}}: Boolean.
- {{SIZE_INFO}}: Width x Height in pixels.

Prompt Structure:

"Create a {{MODE}} illustration for a card game.

GAME CONTEXT (The World):
{{GAME_CONTEXT}}
(Ensure the illustration fits this setting and tone strictly. Adhere to visual constraints.)

SUBJECT:
{{USER_TAGS}}

STYLE:
{{STYLE_PROMPT_SNIPPET}}

BACKGROUND:
Complexity: {{BACKGROUND_COMPLEXITY}}.
{{#if BACKGROUND_PROMPT_TEXT}}
Background specifics: {{BACKGROUND_PROMPT_TEXT}}
{{/if}}
{{#if THEME_COLOR_MODE == 'solid'}}
Use a flat, solid background color: {{THEME_COLOR_HEX}}.
{{/if}}
{{#if !ALLOW_TRANSPARENCY}}
Ensure the background is fully filled with no transparency.
{{/if}}

The illustration must be strictly {{SIZE_INFO}}."