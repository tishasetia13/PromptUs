// settings.js

export function saveApiKey(key) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ gemini_api_key: key }, resolve);
  });
}

export function getApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get("gemini_api_key", (result) => {
      resolve(result.gemini_api_key || null);
    });
  });
}
