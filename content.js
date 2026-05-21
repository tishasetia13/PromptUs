// content.js — floating pill button for Prompt Assistant

(function () {
  'use strict';

  const HOST_ID = '__prompt-assistant-host__';

  const CATEGORIES = [
    { key: 'text',   icon: '✍️',  label: 'Text',   name: 'AI text tools like ChatGPT, Claude, and Gemini' },
    { key: 'image',  icon: '🖼️', label: 'Image',  name: 'AI image generators like Midjourney, DALL·E, and Flux' },
    { key: 'video',  icon: '🎬', label: 'Video',  name: 'AI video generators like Sora, Kling, and Seedance' },
    { key: 'webdev', icon: '🌐', label: 'Webdev', name: 'AI app builders like Lovable, Bolt, and v0' },
  ];

  let host         = null;
  let pillEl       = null;
  let labelEl      = null;
  let dropdownEl   = null;
  let activeInput  = null;
  let targetInput  = null; // captured on pill click; used for write-back after prompt generation
  let hideTimer    = null;
  let dropdownOpen = false;
  let selectedCategory = CATEGORIES[0];

  // Restore saved category on load
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get('__pa_category__', (result) => {
      const saved = result.__pa_category__;
      const found = saved && CATEGORIES.find((c) => c.key === saved);
      if (found) {
        selectedCategory = found;
        if (labelEl) labelEl.textContent = found.label;
        if (dropdownEl) syncDropdownActive(found.key);
      }
    });
  }

  // ── Build the shadow-DOM pill once, lazily ───────────────────────────────

  function init() {
    if (document.getElementById(HOST_ID)) return;

    host = document.createElement('div');
    host.id = HOST_ID;
    Object.assign(host.style, {
      position:      'fixed',
      zIndex:        '2147483647',
      display:       'none',
      pointerEvents: 'none',
      width:         'max-content',
    });

    const shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; }

      .pill {
        display: inline-flex;
        align-items: center;
        height: 40px;
        background: rgba(255, 255, 255, 0.98);
        border: 1.5px solid rgba(0, 0, 0, 0.13);
        border-radius: 20px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
        pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        position: relative;
        opacity: 0;
        transition: opacity 0.15s ease, box-shadow 0.12s ease;
      }

      .pill.visible {
        opacity: 1;
      }

      .pill__left {
        all: unset;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 0 10px 0 6px;
        height: 100%;
        cursor: pointer;
        border-radius: 20px 0 0 20px;
        transition: background 0.12s ease;
      }

      .pill__left:hover {
        background: #f0f4ff;
      }

      .pill__icon {
        width: 28px;
        height: 28px;
        border-radius: 5px;
        display: block;
        flex-shrink: 0;
        user-select: none;
        pointer-events: none;
      }

      .pill__icon--fallback {
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(108, 71, 255, 0.12);
        color: #6c47ff;
        font-size: 14px;
        border-radius: 5px;
      }

      .pill__label {
        font-size: 13px;
        font-weight: 600;
        color: #1a1a2e;
        letter-spacing: 0.01em;
        white-space: nowrap;
        user-select: none;
      }

      .pill__divider {
        width: 1px;
        height: 18px;
        background: rgba(0, 0, 0, 0.12);
        flex-shrink: 0;
      }

      .pill__chevron {
        all: unset;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 100%;
        cursor: pointer;
        border-radius: 0 20px 20px 0;
        color: #888;
        font-size: 10px;
        transition: background 0.12s ease, color 0.12s ease;
      }

      .pill__chevron:hover {
        background: #f0f4ff;
        color: #1a1a2e;
      }

      .dropdown {
        display: none;
        position: absolute;
        bottom: calc(100% + 5px);
        right: 0;
        background: white;
        border: 1.5px solid #e0e0e0;
        border-radius: 10px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        min-width: 120px;
        overflow: hidden;
      }

      .dropdown.open {
        display: block;
      }

      .dropdown__item {
        all: unset;
        display: flex;
        align-items: center;
        gap: 7px;
        width: 100%;
        padding: 8px 13px;
        font-size: 12px;
        font-weight: 500;
        color: #333;
        cursor: pointer;
        transition: background 0.1s ease;
        box-sizing: border-box;
        white-space: nowrap;
      }

      .dropdown__item:hover {
        background: #f0f4ff;
        color: #1d4ed8;
      }

      .dropdown__item.active {
        color: #3b82f6;
        font-weight: 600;
        background: #eff6ff;
      }
    `;

    // Pill
    pillEl = document.createElement('div');
    pillEl.className = 'pill';

    const leftBtn = document.createElement('button');
    leftBtn.className = 'pill__left';
    leftBtn.title = 'Improve this prompt';

    // Extension icon — img when available, styled fallback span otherwise
    let iconEl;
    try {
      const iconUrl = chrome.runtime && chrome.runtime.getURL('icons/icon128.png');
      if (!iconUrl) throw new Error();
      iconEl = document.createElement('img');
      iconEl.className = 'pill__icon';
      iconEl.src = iconUrl;
      iconEl.alt = '';
    } catch (_) {
      iconEl = document.createElement('span');
      iconEl.className = 'pill__icon pill__icon--fallback';
      iconEl.textContent = '✦';
    }

    labelEl = document.createElement('span');
    labelEl.className = 'pill__label';
    labelEl.textContent = selectedCategory.label;

    leftBtn.appendChild(iconEl);
    leftBtn.appendChild(labelEl);

    const divider = document.createElement('div');
    divider.className = 'pill__divider';

    const chevronBtn = document.createElement('button');
    chevronBtn.className = 'pill__chevron';
    chevronBtn.title = 'Choose category';
    chevronBtn.textContent = '▾';

    // Dropdown
    dropdownEl = document.createElement('div');
    dropdownEl.className = 'dropdown';

    CATEGORIES.forEach((cat) => {
      const item = document.createElement('button');
      item.className = 'dropdown__item' + (cat.key === selectedCategory.key ? ' active' : '');
      item.dataset.key = cat.key;

      const itemIcon = document.createElement('span');
      itemIcon.textContent = cat.icon;
      itemIcon.style.cssText = 'font-size:13px;line-height:1;';

      const itemLabel = document.createElement('span');
      itemLabel.textContent = cat.label;

      item.appendChild(itemIcon);
      item.appendChild(itemLabel);
      dropdownEl.appendChild(item);
    });

    pillEl.appendChild(leftBtn);
    pillEl.appendChild(divider);
    pillEl.appendChild(chevronBtn);
    pillEl.appendChild(dropdownEl);

    shadow.appendChild(style);
    shadow.appendChild(pillEl);
    document.documentElement.appendChild(host);

    // Prevent textarea from losing focus on any interaction with the pill
    pillEl.addEventListener('mousedown', (e) => e.preventDefault());

    // Left: stash intent + category, open popup
    leftBtn.addEventListener('click', () => {
      targetInput = activeInput; // capture now — activeInput may be null by the time the prompt returns
      const text = getActiveInputText();
      const payload = { __pa_intent__: text, __pa_category__: selectedCategory.key };
      const send = () => {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage({ action: 'openPopup' });
        }
      };
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set(payload, send);
      } else {
        send();
      }
    });

    // Chevron: toggle dropdown
    chevronBtn.addEventListener('click', () => {
      dropdownOpen = !dropdownOpen;
      dropdownEl.classList.toggle('open', dropdownOpen);
    });

    // Dropdown item: update selected category and persist
    dropdownEl.addEventListener('click', (e) => {
      const item = e.target.closest('.dropdown__item');
      if (!item) return;
      const cat = CATEGORIES.find((c) => c.key === item.dataset.key);
      if (!cat) return;

      selectedCategory = cat;
      labelEl.textContent = cat.label;
      syncDropdownActive(cat.key);

      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ __pa_category__: cat.key });
      }
      closeDropdown();
    });

    // Close dropdown on click outside the pill
    document.addEventListener('click', (e) => {
      if (dropdownOpen && !e.composedPath().includes(host)) closeDropdown();
    });
  }

  function syncDropdownActive(key) {
    if (!dropdownEl) return;
    dropdownEl.querySelectorAll('.dropdown__item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.key === key);
    });
  }

  function closeDropdown() {
    dropdownOpen = false;
    if (dropdownEl) dropdownEl.classList.remove('open');
  }

  // ── Prompt write-back ─────────────────────────────────────────────────────

  function injectPrompt(text) {
    const el = targetInput;
    targetInput = null;
    if (!el || !document.contains(el)) return;

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

  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.__pa_prompt__) return;
      const text = changes.__pa_prompt__.newValue;
      if (text !== undefined) {
        injectPrompt(text);
        chrome.storage.local.remove('__pa_prompt__');
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getActiveInputText() {
    if (!activeInput) return '';
    const text = (activeInput.tagName === 'TEXTAREA' || activeInput.tagName === 'INPUT')
      ? activeInput.value
      : (activeInput.innerText || activeInput.textContent || '');
    return text.trim();
  }

  function isValidInput(el) {
    if (!el || el.id === HOST_ID) return false;
    const tag = el.tagName;
    if (tag === 'TEXTAREA') return true;
    if (tag === 'INPUT') {
      const t = (el.type || '').toLowerCase();
      return ['text', 'search', 'url', 'email', 'tel', 'password', ''].includes(t);
    }
    return el.isContentEditable === true;
  }

  function positionNear(el) {
    const rect   = el.getBoundingClientRect();
    const pillH  = 40;
    const margin = 6;

    let top     = rect.bottom - pillH - margin;
    const right = window.innerWidth - rect.right + margin;

    top = Math.max(margin, Math.min(top, window.innerHeight - pillH - margin));

    host.style.top   = top + 'px';
    host.style.right = Math.max(margin, right) + 'px';
    host.style.left  = 'auto';
  }

  function showPill(el) {
    clearTimeout(hideTimer);
    init();
    positionNear(el);
    host.style.display = 'block';
    void pillEl.offsetWidth; // force reflow so CSS transition fires from opacity:0
    pillEl.classList.add('visible');
  }

  function hidePill() {
    if (!pillEl) return;
    closeDropdown();
    pillEl.classList.remove('visible');
    hideTimer = setTimeout(() => {
      if (host) host.style.display = 'none';
    }, 160);
  }

  // ── Event listeners ──────────────────────────────────────────────────────

  document.addEventListener('focusin', (e) => {
    if (!isValidInput(e.target)) return;
    activeInput = e.target;
    showPill(e.target);
  });

  document.addEventListener('focusout', () => {
    activeInput = null;
    hidePill();
  });

  function reposition() {
    if (activeInput && host && host.style.display !== 'none') positionNear(activeInput);
  }

  window.addEventListener('scroll', reposition, { capture: true, passive: true });
  window.addEventListener('resize', reposition, { passive: true });
})();
