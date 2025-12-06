# User Flows

## 1. Frame Mode
1. **Upload**: User uploads a frame image (PNG transparent) or chooses a template.
2. **Define Window**: User sets the "Art Window" where illustrations will appear.
   - Auto-detect or Manual drag-resize box.
   - Choose shape (Rect, Oval, etc.).
3. **Style Profile**: User uploads references to define the art style.
4. **Generate**: User enters prompt/tags. Gemini generates art fitting the window.
5. **Compositing**: Illustration is placed behind/in-front of frame based on mask.
6. **Export**: User downloads merged PNG or ZIP with layers.

## 2. Illustration Mode
1. **Setup**: Select "Character" or "Scene" mode. Set aspect ratio/size.
2. **References**: Upload reference images (Character, Pose, Style).
   - Batch upload with specific intent notes (e.g., "Use this armor").
3. **Draft Prompt**: System builds prompt from references + user tags + filters.
4. **Generate**: Gemini generates illustration.
5. **Refine**: User can edit region (mask) or request variations.
6. **Save**: Add to project library.

## 3. Full Card Mode
1. **Template Selection**: Choose layout style (e.g., Fantasy, Sci-Fi) or upload custom frame.
2. **Asset Assignment**:
   - Drag/drop generated art into the Art Area.
   - Input text for Name, Cost, Description.
3. **Interactive Layout (Design Tab)**:
   - **Select & Move**: Click any element (Art, Name, Text) on the canvas to select it. Drag to reposition.
   - **Resize**: Drag handles on the bounding box to resize the area. Text reflows automatically.
   - **Fine-Tune**: Use the sidebar for precise percentage inputs or keyboard arrows for nudging.
   - **Inner Art Adjust**: Select Art area, then pan/zoom the image *inside* the box to frame it perfectly.
4. **Typography**: Select fonts and colors for text fields.
5. **Export**: Generate final high-res card image (flat) or export layers.

## 4. Export Flow
1. **Review**: Check all assets in Project view.
2. **Configure**: Select export format (PNG, JPG, PDF) and data (JSON/CSV).
3. **Download**: System packages assets into ZIP.
