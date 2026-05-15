# Prompt Assistant — Chrome Extension

A beginner-friendly Chrome extension built with Manifest V3.

---

## What each file does

| File | Purpose |
|------|---------|
| `manifest.json` | The **ID card** of the extension. Chrome reads this first. It declares the name, version, which HTML file to use as the popup, and where the icon lives. |
| `popup.html` | The **page** that appears when you click the extension icon in the toolbar. Like any web page: HTML for structure, CSS for style, JS for behaviour. |
| `popup.css` | **Styles** for the popup — sets the width, background colour, font, etc. |
| `popup.js` | **JavaScript** that runs inside the popup. Currently just logs a message to the console. This is where you will add features later. |
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
