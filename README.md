# MythicFrame

<div align="center">
  <img width="1200" height="475" alt="MythicFrame Studio Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

  <h3>The Unified Open-Source 2D Game Asset Studio</h3>
  <p>Streamlined prompt engineering, character bible generation, sprite sheets, outpainting, outfit designer, and browser extension bridge.</p>

  <p>
    <a href="#core-philosophy">Philosophy</a> •
    <a href="#features">Features</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#bei-architecture">BEI Bridge</a> •
    <a href="#privacy--security">Privacy & Security</a>
  </p>
</div>

---

## 🧭 Core Philosophy

MythicFrame is built for independent creators and game developers who want a unified, friction-free creative workspace for 2D game asset generation.

### 1. Bring Your Own Account (BYOA) Unified Client
Much like an open-source email client (such as Thunderbird) or an RSS reader connects to your existing accounts, the Browser Extension Interface (BEI) functions as a single unified frontend client. It simply allows you to access and utilize the services and subscriptions you already legitimately own and pay for directly within your personal creative workspace.

### 2. Workflow Consolidation, Not Bot Automation
Rather than acting as a headless bot or unauthorized scraper, MythicFrame serves as an interactive workflow bridge. It eliminates tedious manual friction—copy-pasting prompts between tabs, downloading images, manually inspecting resolution, and organizing files—by piping your own interactive prompts and results straight to your studio canvas.

### 3. Local, Private, and Non-Commercial Open Source
Because MythicFrame runs entirely on your local machine with zero external middleware, tracking, ads, or monetization, your sessions and credentials remain strictly inside your personal browser. It exists purely to give creators a clean, unified interface to craft game assets using their own personal tools.

---

## ⚡ Key Features

* **🎭 Character Bible & Gacha Canvas:** Generate multi-expression portraits, chibi sprites, and consistent character sheets with pose locking and identity anchors.
* **👗 Clothes & Garment Designer:** Isolate garments, design new armor sets, and render transparent clothing assets directly on mannequin references.
* **🕹️ Pixel Art Studio & Palette Shading:** Transform concepts into authentic retro game sprites across 8-bit, 16-bit, Game Boy, GBA, and Arcade color palettes.
* **🖼️ Magic Resizer & Outpainting:** Pan, zoom, and expand canvases seamlessly to any game resolution or aspect ratio.
* **✂️ Background Replacer & Neo Matting:** Dual decontamination pipeline for clean edge extraction and green/white keying.
* **🎞️ Sprite Sheet & Animation Timeline:** Generate directional keyframe animation sequences (idle, run, attack, cast) with onion skinning and GIF preview.
* **✨ Zero-Quota Prompt Refinement & Inspiration:** Built-in AI prompt engineering assistant that refines prompts and synthesizes tailored game inspirations with zero image quota consumption.
* **📋 Prompt Inspector & Universal Exporter:** Package fully assembled prompts and image references for Midjourney, ChatGPT, Stable Diffusion, or Pollinations with 1-click clipboard bundle export.
* **🔌 Browser Extension Interface (BEI):** Native Chrome extension bridge to authenticated Gemini Web and ChatGPT Web sessions for zero-key local operation.

---

## 🚀 Quick Start

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [Google Chrome](https://www.google.com/chrome/) (optional, for BEI browser extension mode)

### 1. Installation
```bash
git clone https://github.com/VioleGracex/mythicframe.git
cd mythicframe
npm install
```

### 2. Run Locally
```bash
# Starts both the Vite frontend studio and the BEI local bridge server
npm run dev
```

Open your browser at **`http://localhost:3488`**.

---

## 🔌 Browser Extension Interface (BEI)

The BEI Chrome Extension connects your existing logged-in browser tabs directly to your MythicFrame canvas:

1. Open Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** (top right).
3. Click **Load unpacked** (top left) and select the `bei-extension` folder inside this repository.
4. Keep a Gemini Web (`gemini.google.com`) or ChatGPT Web (`chatgpt.com`) tab open.
5. In MythicFrame Studio, select **Browser Bridge (BEI)** in the AI Engine Selector card.
6. Generate artwork directly onto your canvas with automatic high-res capture!

> For full setup details, see [`bei-extension/INSTALLATION_AND_USAGE_GUIDE.md`](./bei-extension/INSTALLATION_AND_USAGE_GUIDE.md).

---

## 🔒 Privacy & Security

* **100% Local Execution:** The application, bridge server, and extension execute strictly on `127.0.0.1` on your machine.
* **Zero Credential Transmission:** No passwords, cookies, or session tokens are ever extracted or transmitted over any network. All authentication lives exclusively inside your standard browser session.
* **Manual Stop Interception:** Detects user clicks on browser "Stop response" buttons instantly, aborting generation gracefully with zero daily quota deduction.
* **Optional Official API Mode:** If you prefer direct API keys, you can provide your own Gemini API key in **Settings**, stored strictly in your browser's private `localStorage`.

---

## 📄 License

Open-source under the [MIT License](LICENSE). Non-commercial creative utility.
