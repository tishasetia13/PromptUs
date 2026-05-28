// content.js — thin, invisible helper for Prompt Assistant

(function () {
  'use strict';

  // ── Read text from the page's active editable field ──────────────────────

  function getEditableText() {
    const focused = document.activeElement;
    const tag = focused && focused.tagName;

    if (tag === 'TEXTAREA' || (tag === 'INPUT' && (focused.type || 'text') === 'text')) {
      return focused.value.trim();
    }
    if (focused && focused.isContentEditable) {
      return (focused.innerText || focused.textContent || '').trim();
    }

    // Nothing focused — fall back to first editable on the page
    const el = document.querySelector('textarea, [contenteditable="true"]');
    if (!el) return '';
    return (el.value !== undefined ? el.value : (el.innerText || el.textContent || '')).trim();
  }

  // ── Respond to popup asking for the current intent ────────────────────────

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'getIntent') {
      sendResponse({ intent: getEditableText() });
    }
    return false;
  });

  // ── Write generated prompt back into the page's editable field ───────────

  function injectPrompt(text) {
    const focused = document.activeElement;
    const tag = focused && focused.tagName;

    let el = null;
    if (tag === 'TEXTAREA' || (tag === 'INPUT' && (focused.type || 'text') === 'text')) {
      el = focused;
    } else if (focused && focused.isContentEditable) {
      el = focused;
    } else {
      el = document.querySelector('textarea, [contenteditable="true"]');
    }

    if (!el) return;

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      // Native property setter ensures React's synthetic onChange fires
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, text);
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (el.isContentEditable) {
      // execCommand goes through the browser's native editing path, which
      // React/Vue contenteditable editors (ChatGPT, Claude, Gemini) listen to
      el.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text);
    }
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.__pa_prompt__) return;
    const text = changes.__pa_prompt__.newValue;
    if (text !== undefined) {
      injectPrompt(text);
      chrome.storage.local.remove('__pa_prompt__');
    }
  });

})();
