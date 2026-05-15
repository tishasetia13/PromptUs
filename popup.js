// popup.js
// This file runs every time the popup is opened.
// It asks the active tab's content script which AI platform is detected,
// then updates the UI to show the result.

console.log("Prompt Assistant popup loaded successfully!");

// Grab the status element we'll update with the platform name
const statusEl = document.getElementById("platform-status");

// --- Step 1: Find out which tab the user is currently looking at ---

// chrome.tabs.query finds tabs matching the filter we pass in.
// { active: true, currentWindow: true } means "the tab the user has open right now".
chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const activeTab = tabs[0];

  // Safety check: if for some reason there's no active tab, show the fallback.
  if (!activeTab) {
    showNotDetected();
    return;
  }

  // --- Step 2: Send a message to the content script running in that tab ---

  // content.js is listening for { action: "getPlatform" } and will reply
  // with { platform: "midjourney" } or { platform: "unknown" }.
  chrome.tabs.sendMessage(
    activeTab.id,
    { action: "getPlatform" },
    function (response) {
      // chrome.runtime.lastError is set if the message couldn't be delivered.
      // This happens on pages like chrome://, google.com, etc. where our
      // content script isn't injected — that's expected, not a real error.
      if (chrome.runtime.lastError) {
        showNotDetected();
        return;
      }

      // --- Step 3: Update the UI based on what the content script reported ---

      if (response && response.platform === "midjourney") {
        statusEl.textContent = "✅ Midjourney detected!";
        statusEl.classList.add("detected");
      } else {
        showNotDetected();
      }
    }
  );
});

// Helper: show the "not detected" message and style
function showNotDetected() {
  statusEl.textContent = "❌ No supported AI platform detected on this tab";
  statusEl.classList.add("not-detected");
}
