# Prompt Assistant — Chrome Extension

A beginner-friendly Chrome extension built with Manifest V3.

---

## Build log

### Phase 0 — Extension skeleton ✅
Basic working extension: popup loads, icon shows in toolbar, console log confirms it's alive.

### Phase 1 — Platform detector ✅
Added a content script (`content.js`) that runs on Midjourney.com and detects the current platform. The popup now queries the active tab and displays a colour-coded status badge:

- **✅ Midjourney detected!** (green) — shown when the user is on midjourney.com
- **❌ No supported AI platform detected on this tab** (red) — shown on all other pages

**Files added / changed in Phase 1:**

| File | What changed |
|------|-------------|
| `content.js` | New file. Detects the platform from `window.location.hostname` and listens for messages from the popup. |
| `manifest.json` | Registered `content.js` as a content script for `*.midjourney.com`; added `activeTab` permission. |
| `popup.js` | Queries the active tab, sends a `getPlatform` message to the content script, and updates the UI with the result. |
| `popup.html` | Added `#platform-status` element that shows the detection result. |
| `popup.css` | Styled `#platform-status` with a neutral default and green/red variants for detected/not-detected states. |

### Phase 3 — Smarter Gemini prompts ✅
Rewrote both the question-generation and final-prompt-generation Gemini prompts. Replaced loose instruction lists with explicit step-by-step workflows. Added a foundational → structural → refining tier model so questions and final prompts both flow from basics to refinements. Restructured category blocks to use the same tier model. Questions can now be variable in count (including zero), and options are optional with a mandatory "Something else" escape when present.

### Phase 2.6 — Category-first UX refactor ✅
Replaced platform detection with user-driven category selection. The popup now shows four buttons (Text, Image, Video, Webdev) instead of trying to detect which AI platform the user is on. This is more reliable, more intuitive, and works on any tab.

**What changed:**
- `popup.html` — Removed platform status badge, added four category buttons
- `popup.css` — Added category button grid styles, removed platform badge styles
- `popup.js` — Replaced platform detection logic with category button click handlers
- `content.js` — Gutted (reserved for future use)
- `manifest.json` — Removed content_scripts, simplified permissions

---

## What each file does

| File | Purpose |
|------|---------|
| `manifest.json` | The **ID card** of the extension. Chrome reads this first. It declares the name, version, which HTML file to use as the popup, which pages to inject scripts into, and where the icon lives. |
| `popup.html` | The **page** that appears when you click the extension icon in the toolbar. Like any web page: HTML for structure, CSS for style, JS for behaviour. |
| `popup.css` | **Styles** for the popup — sets the width, background colour, font, and the platform status badge colours. |
| `popup.js` | **JavaScript** that runs inside the popup. Asks the active tab which platform is detected and updates the status badge. |
| `content.js` | **Content script** injected into Midjourney pages. Detects the platform and responds to messages from the popup. |
| `icons/icon128.png` | The **toolbar icon** Chrome displays next to the address bar. 128 × 128 pixels. |

---

## How to load the extension into Chrome (Mac)

1. Open Chrome and go to this address in the URL bar:
   ```
   chrome://extensions
   ```

2. In the top-right corner, turn on **Developer mode** (toggle switch).

3. Click the **"Load unpacked"** button that appears on the left.

4. In the file picker, navigate to this folder (`prompt-assistant`) and click **Open** (or **Select Folder**).

5. The extension now appears in the list. Click the **puzzle-piece icon** (🧩) in the Chrome toolbar, find "Prompt Assistant", and pin it so it's always visible.

6. Click the extension icon — you should see the popup with **"Prompt Assistant is alive 🎉"**.

---

## Making changes

After editing any file, go back to `chrome://extensions` and click the **refresh icon** (↺) on the Prompt Assistant card to reload it. Then close and reopen the popup to see your changes.

---

## Inspecting the popup (DevTools)

Right-click anywhere inside the popup and choose **Inspect** to open Chrome DevTools for the popup. The **Console** tab will show the log message from `popup.js`.
