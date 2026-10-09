# MythicFrame BEI Bridge (Chrome Extension)

Browser Extension Interface (BEI) for **[MythicFrame](http://localhost:3488)**.

Connects your existing logged-in sessions in **Google Gemini Web** (`gemini.google.com`) and **ChatGPT Web** (`chatgpt.com`) directly into MythicFrame Studio without needing API keys, Google Cloud billing, credit cards, or developer quotas.

---

## 📚 Complete Guides & Documentation

* **For Full Conceptual & System Architecture:**  
  👉 See **[`docs/BEI_MODE.md`](../docs/BEI_MODE.md)**
* **For Human Step-by-Step Setup & AI / CLI Automation Guide:**  
  👉 See **[`INSTALLATION_AND_USAGE_GUIDE.md`](./INSTALLATION_AND_USAGE_GUIDE.md)**

---

## ⚡ Quick 30-Second Installation in Google Chrome

1. Open Google Chrome and go to:
   ```text
   chrome://extensions/
   ```
2. Enable **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select this folder:  
   `D:\GeminiWeb\mythicframe\bei-extension`
5. The extension badge will turn purple and display **ON** as soon as MythicFrame server is running!

---

## 🔌 Ports & Network Isolation

* **MythicFrame Studio:** `http://localhost:3488`
* **BEI Bridge HTTP API:** `http://127.0.0.1:58925/api/bei/*`
* **BEI Bridge WebSocket:** `ws://127.0.0.1:58925`
* **Isolated Environment:** Runs on dedicated port `58925` to avoid collisions with any other running tools or extensions.

---

## 🤖 Features at a Glance

* **Zero API Key Requirement:** Generates 100% free with top web models (Google **Imagen 3** & OpenAI **DALL-E 3**).
* **Multi-Account Rotation:** Instant dropdown switching across accounts (`/u/0/`, `/u/1/`, etc.) when quota limits are reached.
* **Automatic Reference Upload:** Attaches sprites, character poses, and style references with dynamic upload timeout handling.
* **Smart Tab Grouping:** Organizes browser tabs cleanly into a dedicated purple `"MythicFrame BEI"` tab group in your current window or a separate window.
