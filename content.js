// content.js
// This script runs on every page the user visits (as configured in manifest.json).
// Its job is to detect which AI platform the user is on and report that back to the popup.

// --- Step 1: Detect the current platform ---

// Get the current website's hostname (e.g., "www.midjourney.com")
const hostname = window.location.hostname;

// Start by assuming we don't know the platform
let platform = "unknown";

// Check if the hostname contains "midjourney.com"
if (hostname.includes("midjourney.com")) {
  platform = "midjourney";
}

// --- Step 2: Log the result so we can see it in DevTools ---

console.log("Prompt Assistant: detected platform =", platform);

// --- Step 3: Listen for messages from the popup ---

// The popup will send us a message asking what platform we're on.
// We listen for that message here and reply with our detected platform.
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  // Check that this is the message we expect
  if (message.action === "getPlatform") {
    // Reply with the platform we detected when the page loaded
    sendResponse({ platform: platform });
  }

  // Returning true keeps the message channel open for async responses.
  // It's a good habit to include this even for synchronous replies.
  return true;
});
