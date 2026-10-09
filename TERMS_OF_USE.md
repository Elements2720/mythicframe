# MythicFrame Terms of Use & Non-Commercial Policy

**Last Updated:** October 2026

Please read these Terms of Use ("Terms") carefully before using **MythicFrame** ("the Software"). By downloading, cloning, compiling, or using the Software, you agree to be bound by these Terms and the [PolyForm Noncommercial License 1.0.0](LICENSE).

---

## 1. Non-Commercial Scope & License

MythicFrame is released as an open-source, source-available, non-commercial software project under the **PolyForm Noncommercial License 1.0.0**.

### Permitted Uses (Non-Commercial):
* **Personal & Hobbyist Game Creation**: Creating 2D art, character sheets, sprite sheets, and mockups for non-monetized personal indie games and game jams.
* **Academic & Educational Use**: Learning digital art techniques, teaching game development workflows, and academic research.
* **Open-Source Contribution**: Auditing, debugging, enhancing, and modifying the source code for the benefit of the non-commercial open-source community.

### Strictly Prohibited Uses (Commercial):
* **Direct Commercial Resale**: You may not sell, sublicense, charge fees for, or monetize copies or binaries of the Software.
* **Commercial SaaS / Cloud Wrapping**: You may not host or run MythicFrame as a paid online service, subscription platform, or pay-per-generation API endpoint.
* **Commercial Proprietary Bundling**: You may not embed or bundle MythicFrame within closed-source, commercial, or for-profit software products.

---

## 2. Architecture & Truthful Technical Disclosure of BEI

The **Browser Extension Interface (BEI)** is a client-side assistive bridge between MythicFrame Studio (running on `localhost`) and the user's active Chromium browser tabs.

### What BEI Does:
1. **Local Communication**: Operates strictly on your local machine using an internal loopback connection (`http://127.0.0.1:58925` / `ws://127.0.0.1:58925`).
2. **Standard DOM Interaction**: Dispatches standard DOM events (such as typing text into the user input element and clicking the send button) inside the user's open tab, exactly as a human creator would do manually.
3. **Workflow Friction Elimination**: Bridges prompt submission and image transfer directly to your local canvas, removing the repetitive burden of manual copy-pasting, tab-switching, and file downloading.

### What BEI Does NOT Do:
1. **No Credential Interception**: BEI does **not** read, scrape, store, log, or transmit passwords, cookies, authorization tokens, or payment details. Your web session remains strictly secured within your browser's private sandbox.
2. **No Paywall or Security Circumvention**: BEI does **not** bypass paywalls, crack feature locks, or unlock paid features. It only accesses whatever tier or model is already accessible in your logged-in browser session.
3. **No Private API Reverse Engineering**: BEI interacts exclusively with the public browser DOM. It does not mimic or reverse-engineer private, encrypted Google or OpenAI internal protocol endpoints.
4. **No Rate Limit Bypassing**: When a platform signals a daily quota limit, rate cooldown, or content refusal, BEI detects and respects that status immediately, relaying it truthfully to the interface.

---

## 3. Third-Party Service Compliance & User Responsibility

1. **Independent Project**: MythicFrame is an independent community project. It is **not** endorsed by, certified by, partnered with, or sponsored by Google LLC, Alphabet Inc., OpenAI Inc., or any other third-party provider.
2. **User Responsibility**: Users who choose to connect external accounts (such as Google Gemini Web, ChatGPT Web, Google Cloud Gemini API, or OpenAI API) are solely responsible for reviewing and complying with the respective third party's:
   * Terms of Service
   * Acceptable Use Policies
   * Community Guidelines and Rate Limits
3. **Account Safety**: The authors and contributors of MythicFrame are not responsible for any actions taken by third-party providers regarding your accounts, including but not limited to rate-limiting, cooldowns, or service changes.

---

## 4. Acceptable Content & Safety Guidelines

You agree **not** to use MythicFrame to create, generate, or propagate:
* Content that depicts child exploitation, non-consensual sexual material, or violent extremism.
* Defamatory, fraudulent, malicious, or harassing content.
* Automated denial-of-service, scraping, or spamming campaigns against third-party web services.

Users must respect third-party content safety policies and guidelines when generating imagery.

---

## 5. Disclaimer of Warranties & Limitation of Liability

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT.

IN NO EVENT SHALL THE AUTHORS, COPYRIGHT HOLDERS, OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF DATA, WORK STOPPAGE, ACCOUNT ACTIONS BY THIRD PARTIES, OR COMPUTER FAILURE) ARISING OUT OF OR IN CONNECTION WITH THE SOFTWARE.
