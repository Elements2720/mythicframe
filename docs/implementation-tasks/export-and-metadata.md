# Export & Metadata Tasks

## Core Export Features
- [x] **Single Image Export**
  - [x] Export currently selected image as PNG
  - [x] Ensure correct filename generation (app_mode_timestamp.png)
- [x] **Smart Export Logic**
  - [x] If only image is requested (no metadata), download directly as .png
  - [x] If metadata is requested, bundle into .zip

## ZIP Bundle Generation
- [x] **Asset Bundling**
  - [x] Include generated image file
  - [x] Include `metadata.json` with structured data
  - [x] Include `prompt.txt` with readable summary
- [x] **Metadata Content**
  - [x] User Prompt & Full Constructed Prompt
  - [x] Style ID & Settings
  - [x] Reference Assets (roles/notes)
  - [x] Game Context (optional)
  - [x] Timestamp & Mode

## UI Integration
- [x] **Export Dialog**
  - [x] Checkboxes for "Include Image", "Include Prompts", "Include Project Context"
  - [x] Dynamic button label (Download PNG vs Download ZIP)
  - [x] Preview of item being exported
- [x] **History Panel Integration**
  - [x] Quick export button on history items