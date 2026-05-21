// background.js — service worker
// Receives a message from the content script's floating button and opens the popup.
// chrome.action.openPopup() is available without a user-gesture requirement in Chrome 127+.

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'openPopup') {
    chrome.action.openPopup().catch(() => {});
  }
});
