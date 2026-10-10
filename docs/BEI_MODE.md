# MythicFrame BEI Mode (Browser Extension Interface)

**BEI Mode** stands for **Browser Extension Interface**.

It is MythicFrame's **Zero API Key** operating mode that enables generating game assets and AI artwork directly through your personal, authenticated browser sessions (**Google Gemini Web** and **ChatGPT Web**) without needing paid API keys, Google Cloud billing, or developer API quotas.

---

## 1. Executive Summary

| Attribute | Standard Developer API | BEI Mode (Browser Extension Interface) |
| :--- | :--- | :--- |
| **Cost** | Pay-per-image billing (e.g., Google Cloud / OpenAI bills) | **100% Free & Unlimited** (personal web accounts) |
| **API Keys Required** | Yes (Gemini API Key, OpenAI API Key) | **None (Zero API Key)** |
| **Models Available** | Restricted to developer tier quotas | Latest web models (Google **Imagen 3**, OpenAI **DALL-E 3**) |
| **Reference Uploads** | Multi-modal Base64 inline payload limits | Full multi-modal reference image attachments |
| **Quota Recovery** | Hard stop until monthly billing reset or tier upgrade | **Instant Account Rotation** across Google slots (`/u/0/`, `/u/1/`, etc.) |

---

## 2. How It Works

```
+-------------------------------------------------------------------------+
|                          MythicFrame Studio UI                          |
|                       (http://localhost:3488)                           |
+-------------------------------------------------------------------------+
                                    |
                 1. Generates 5-Layer Mythic Prompt & Payload
                 2. Connects to Local Bridge (HTTP / WebSocket)
                                    v
+-------------------------------------------------------------------------+
|                         MythicFrame BEI Bridge                          |
|                    (Port 58925: HTTP REST + WebSocket)                  |
+-------------------------------------------------------------------------+
                                    |
                 3. Dispatches Job to Chrome Extension Worker
                 4. Streams Real-Time Progress Events via SSE
                                    v
+-------------------------------------------------------------------------+
|                  MythicFrame BEI Chrome Extension (MV3)                 |
|             (background.js + content scripts + protocol.js)             |
+-------------------------------------------------------------------------+
       |                                                    |
       v                                                    v
+-----------------------------+              +----------------------------+
| Google Gemini Web Tab       |              | ChatGPT Web Tab            |
| (https://gemini.google.com) |              | (https://chatgpt.com)      |
| Slot /u/0/, /u/1/, /u/2/... |              | Authenticated Session      |
+-----------------------------+              +----------------------------+
```

### 1. Direct Web Bridge
Instead of sending HTTP calls to paid endpoints like the Google Generative AI API or OpenAI API, MythicFrame connects via a local WebSocket bridge (`ws://127.0.0.1:58925`) and HTTP proxy (`http://127.0.0.1:58925/api/bei/*`) directly to the custom MythicFrame BEI Chrome Extension.

### 2. Multi-Account Browser Routing
When you click **Generate**, the extension routes your request to a background tab logged into your chosen Google account slot:
* `/u/0/app` — Default Google Account
* `/u/1/app` — Second Google Account
* `/u/2/app` — Third Google Account
* `/u/3/app` — Fourth Google Account

The extension automatically manages tab layout according to your setting:
* **Same Window Group:** Organizes all generation tabs into a single designated purple tab group named `"MythicFrame BEI"` in your current Chrome window.
* **Dedicated Window:** Moves generation tabs into a separate standalone Chrome window.
* **Background Tabs:** Runs generation completely in the background without stealing your active focus.

### 3. Automated Web Interactions
Content scripts inside the target browser tab execute the full generation lifecycle:
1. **Pristine Composer Reset:** Cleans previous draft text and removes stale attachment chips.
2. **Native Tool Selection:** Automatically detects and triggers the native `"Create image"` tool tag in the Gemini composer using Angular CDK-compatible event sequences.
3. **Reference Image Upload:** 
   * Converts reference images (sprites, character cutouts, pose guides, style references) into native browser `File` objects.
   * Dispatches files via scoped file input and HTML5 Drag & Drop data transfers.
   * Auto-dismisses Google upload consent / rights disclaimer dialogs (*"I agree"*, *"Got it"*).
   * Monitors active upload progress indicators (`mat-progress-spinner`, `mat-progress-bar`, `[role="progressbar"]`) with dynamic timeout extension for slower network connections.
4. **Dynamic Context Assembly Injection:** Injects MythicFrame's procedurally assembled 5-layer prompt:
   $$\text{Final Prompt} = \text{User Intent} + \text{Game Context (Setting/Tone)} + \text{Style Snippet} + \text{Spatial Constraints} + \text{System Rules}$$
5. **Send Execution:** Verifies the send button is active and enabled, then submits the prompt directive.

### 4. High-Resolution Asset Extraction
* As soon as Gemini's Imagen 3 or ChatGPT generates the final artwork, the extension captures the image directly from the DOM.
* **Resolution Upgrade:** Rewrites Google CDN sizing parameters (e.g. `=s1024`, `=w1024-h1024`) to uncompressed high-resolution versions (`=s0` or `=s2048`).
* The background worker or bridge server converts the image into a clean Base64 Data URI and streams it back into MythicFrame Studio.

---

## 3. Key Benefits

### 1. 100% Free & Unlimited
Bypasses pay-per-image developer API pricing by utilizing standard, authenticated browser sessions. There are no Google Cloud billing accounts, credit card requirements, or API subscription fees.

### 2. Access to Top Models
Direct access to Google's flagship web-based **Imagen 3** engine with photorealistic quality, fine character detail, and high-fidelity text rendering.

### 3. Instant Multi-Account Quota Rotation
If one Google account hits a daily limit or enters cooldown:
* The UI displays real-time quota status badges (`🟢 Ready • 12/50 reqs`, `🟡 High Usage`, or `🔴 Cooldown (14m)`).
* Simply select a different account from the dropdown in the header or right panel.
* MythicFrame immediately routes subsequent generations to the fresh account tab without interrupting your creative session.

---

## 4. Built-In Resilience & Safety Features

* **Fake Active Mode & Anti-Throttling:** Overrides `document.hidden`, `document.visibilityState`, and traps `visibilitychange` events, paired with an inaudible `AudioContext` media stream. This prevents Chromium and Angular from suspending background tabs or throttling JavaScript execution timers during long image generation sessions.
* **Default Dedicated Window Grouping:** Isolates generation tabs into a dedicated standalone window with a labeled purple tab group (`"MythicFrame BEI"`), eliminating workspace clutter while preventing background tab sleeping.
* **Dynamic Network Timeout:** Automatically extends upload waiting times up to 150–210 seconds while Google Scotty media servers are actively transmitting bytes, preventing premature timeouts on slower connections.
* **Real-Time Heartbeat Keep-Alive:** Extension service worker maintains an active keep-alive communication port during generation so Chrome never suspends the worker mid-request.
* **Safety & Policy Refusal Detection:** Detects prompt refusals instantly (*"cannot generate"*, *"violates policy"*) and fails immediately with a descriptive message rather than hanging.
* **Rate Limit Detection:** Catches web rate limit messages (*"daily limit reached"*) and notifies the user to switch to another Google account slot.
* **Automatic Session Persistence:** All workspace tabs, prompts, aspect ratios, canvas layers, and reference assets are persistently saved to IndexedDB (`MythicFrameDB`) and cached across localhost restarts.
