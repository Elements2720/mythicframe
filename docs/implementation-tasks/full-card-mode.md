
# Full Card Mode Tasks

## Templates & Layout
- [x] Predefined templates (MTG, Hearthstone, Yu-Gi-Oh styles)
- [x] Custom full-card background upload
- [x] Layer management (Frame, Art, Text)

## Text & Typography
- [x] Font picker with preview
- [x] Text styling (Color, Shadow, Stroke)
- [x] Text areas for Title, Description, Cost, Stats

## Design/Layout Tab
- [x] Configuration UI for Art, Name, Description, Mana
- [x] Live preview with generated art
- [x] Layer order toggles (Behind/Front)
- [x] Reset functionality

## Photoshop-like Layout Editing
- [x] **Direct Manipulation**
  - [x] Selectable layers (Art, Text) with visual bounding boxes
  - [x] Drag-to-move elements on canvas
  - [x] Resize handles (corners/sides) for Art and Text boxes
- [x] **Synchronized Controls**
  - [x] Sidebar numeric inputs sync live with canvas interactions
  - [x] Canvas interactions sync live with sidebar inputs
- [x] **Text Handling**
  - [x] Visual text box resizing with auto-reflow
  - [x] Keyboard nudging (Arrows for 1%, Shift+Arrows for 5%)
- [x] **Art Area Power Tools**
  - [x] "Inner Pan": Move art image *inside* the layout box (Via sidebar sliders)
  - [x] "Inner Zoom": Scale art image *inside* the layout box (Via sidebar sliders)

## Data Binding (New)
- [x] **CSV Integration**
  - [x] Upload CSV file with card data
  - [x] Robust CSV Parser (no regex issues)
  - [x] Slider to iterate through CSV rows
  - [x] Auto-map CSV columns to card fields (Name, Mana, Description)

## Card Name & Effects Suggestions
- [x] Gemini-powered suggestions for Card Name based on art/tags
- [x] Gemini-powered suggestions for Card Effects/Flavor text
- [x] Click-to-apply suggestions to inputs

## Integration
- [x] Load frame from Frame Mode ("Set as Template")
- [x] Load art from Illustration Mode ("Use in Layout" or "Choose from Library")
- [x] Export flat PNG (Card + Art + Text)
- [x] Export ZIP with metadata
- [x] Implement Card Role/Mechanic metadata (Type Line)
