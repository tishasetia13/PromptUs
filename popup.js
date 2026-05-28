// popup.js
// Runs every time the popup is opened. Coordinates all screens and wires
// up navigation between welcome → questions → anything-else → summary.

import { showQuestion, showSummary, currentQuestionIndex, userAnswers, activeQuestions } from "./mcq.js";
import { generateQuestions, generatePrompt } from "./gemini.js";

console.log("Prompt Assistant popup loaded successfully!");

// ── Element references ──────────────────────────────────────────────────────

const generateBtn = document.getElementById("generate-btn");

// ── Section switcher (within main-screen) ──────────────────────────────────

const SECTIONS = [
  "intent-fallback-section",
  "category-section",
  "question-section",
  "anything-else-section",
  "summary-section",
];

function showSection(id) {
  SECTIONS.forEach((s) => {
    document.getElementById(s).style.display = s === id ? "block" : "none";
  });
}

// ── On load: pre-fill intent from active tab if available ─────────────────

(async () => {
  let prefill = "";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { action: "getIntent" });
      prefill = (response?.intent || "").trim();
    }
  } catch (_) {}
  if (!prefill) return;
  document.getElementById("fallback-intent-input").value = prefill;
  document.getElementById("fallback-start-btn").disabled = false;
  userIntent = prefill;
  showSection("category-section");
})();

// ── Question-section loading helpers ──────────────────────────────────────

function showQuestionsLoading() {
  document.getElementById("questions-loading").style.display = "flex";
  document.getElementById("progress-text").style.display = "none";
  document.getElementById("question-text").style.display = "none";
  document.getElementById("options-container").style.display = "none";
}

function hideQuestionsLoading() {
  document.getElementById("questions-loading").style.display = "none";
  document.getElementById("progress-text").style.display = "block";
  document.getElementById("question-text").style.display = "block";
  document.getElementById("options-container").style.display = "block";
}

// ── MCQ flow navigation ────────────────────────────────────────────────────

let userIntent = "";
let selectedCategory = { name: "AI text tools like ChatGPT, Claude, and Gemini", category: "text" };

// SVG icons (inline) — replaced the original emoji icons to match the new monochrome design.
// The cat-icon span and overall HTML structure are unchanged; we just inject SVG markup
// instead of an emoji glyph.
const ICON_TEXT   = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="16" y2="12"/><line x1="4" y1="17" x2="11" y2="17"/></svg>`;
const ICON_IMAGE  = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.6"/><path d="M3 17l5-5 4 4 3-3 6 6"/></svg>`;
const ICON_VIDEO  = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3z"/></svg>`;
const ICON_WEBDEV = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 8 3 12 8 16"/><polyline points="16 8 21 12 16 16"/><line x1="14" y1="5" x2="10" y2="19"/></svg>`;

const CATEGORIES = [
  { key: 'text',   icon: ICON_TEXT,   label: 'Text',   desc: 'Long-form, chat, code, analysis', name: 'AI text tools like ChatGPT, Claude, and Gemini' },
  { key: 'image',  icon: ICON_IMAGE,  label: 'Image',  desc: 'Stills, illustrations, photography', name: 'AI image generators like Midjourney, DALL·E, and Flux' },
  { key: 'video',  icon: ICON_VIDEO,  label: 'Video',  desc: 'Motion, cinematics, b-roll',         name: 'AI video generators like Sora, Kling, and Seedance' },
  { key: 'webdev', icon: ICON_WEBDEV, label: 'Webdev', desc: 'Apps, sites, components',            name: 'AI app builders like Lovable, Bolt, and v0' },
];

// Render category cards once on load
const categoryOptions = document.getElementById("category-options");
CATEGORIES.forEach((cat) => {
  const card = document.createElement("button");
  card.className = "category-card";
  card.innerHTML = `
    <span class="cat-icon">${cat.icon}</span>
    <span class="cat-info">
      <span class="cat-label">${cat.label}</span>
    </span>
  `;
  card.addEventListener("click", () => {
    selectedCategory = { name: cat.name, category: cat.key };
    startQuestionsFlow(userIntent);
  });
  categoryOptions.appendChild(card);
});

// Shared helper — kicks off question generation with a given intent string
async function startQuestionsFlow(intent) {
  userIntent = intent;
  showSection("question-section");
  showQuestionsLoading();

  try {
    const aiQuestions = await generateQuestions(selectedCategory.name, userIntent, selectedCategory.category);
    hideQuestionsLoading();
    showQuestion(0, aiQuestions, userIntent);
  } catch (err) {
    alert(`Could not generate questions: ${err.message}`);
    showSection("intent-fallback-section");
  }
}

// ── Typewriter placeholder for intent textarea ────────────────────────────
const INTENT_PLACEHOLDERS = [
  "e.g. roast my LinkedIn bio and rewrite it",
  "e.g. a wolf in a neon-lit Tokyo alley, cinematic shot",
  "e.g. drone shot flying over misty mountains at sunrise",
  "e.g. a SaaS landing page with waitlist signup, dark mode",
];
(function typewriterPlaceholder() {
  const el = document.getElementById("fallback-intent-input");
  let stopped = false;
  let phraseIndex = 0;

  el.addEventListener("input", () => {
    stopped = true;
    el.placeholder = "";
  }, { once: true });

  function typePhrase() {
    if (stopped) return;
    const phrase = INTENT_PLACEHOLDERS[phraseIndex];
    let charIndex = 0;

    function typeChar() {
      if (stopped) return;
      charIndex++;
      el.placeholder = phrase.slice(0, charIndex);
      if (charIndex < phrase.length) {
        setTimeout(typeChar, 45);
      } else {
        setTimeout(() => {
          if (stopped) return;
          el.placeholder = "";
          phraseIndex = (phraseIndex + 1) % INTENT_PLACEHOLDERS.length;
          setTimeout(typePhrase, 80);
        }, 2000);
      }
    }

    typeChar();
  }

  typePhrase();
})();

// Enable/disable Continue based on fallback input
document.getElementById("fallback-intent-input").addEventListener("input", (e) => {
  document.getElementById("fallback-start-btn").disabled =
    e.target.value.replace(/\s/g, "").length < 3;
});

// Continue from fallback screen → category selection
document.getElementById("fallback-start-btn").addEventListener("click", () => {
  userIntent = document.getElementById("fallback-intent-input").value.trim();
  showSection("category-section");
});

document.getElementById("category-back-btn").addEventListener("click", () => {
  showSection("intent-fallback-section");
});

document.getElementById("on-back-btn").addEventListener("click", () => {
  if (currentQuestionIndex === 0) {
    showSection("category-section");
  } else {
    showQuestion(currentQuestionIndex - 1);
  }
});

document.getElementById("anything-else-back-btn").addEventListener("click", () => {
  showSection("question-section");
  showQuestion(currentQuestionIndex); // re-render the last question
});

document.getElementById("to-summary-btn").addEventListener("click", () => {
  showSection("summary-section");
  showSummary();
});

document.getElementById("summary-back-btn").addEventListener("click", () => {
  showSection("anything-else-section");
});

// ── Generate button: call Gemini and display the result ───────────────────

generateBtn.addEventListener("click", async () => {
  generateBtn.classList.add("loading");
  generateBtn.textContent = "Generating...";

  const formattedAnswers = activeQuestions
    .map((q, i) => `${q.question}: ${userAnswers[i] || "—"}`)
    .join("\n");
  const extraNotes = document.getElementById("extra-input").value.trim();

  try {
    const promptText = await generatePrompt(selectedCategory.name, userIntent, formattedAnswers, extraNotes, selectedCategory.category);
    generateBtn.classList.remove("loading");
    generateBtn.textContent = "Prompt Generated";
    generateBtn.disabled = true;
    document.getElementById("generated-prompt").textContent = promptText;
    document.getElementById("result-section").style.display = "block";
    chrome.storage.local.set({ __pa_prompt__: promptText });
  } catch (err) {
    generateBtn.classList.remove("loading");
    generateBtn.textContent = "Generate my prompt";
    alert(`Could not generate prompt: ${err.message}`);
  }
});

// ── Copy button ───────────────────────────────────────────────────────────

document.getElementById("copy-btn").addEventListener("click", async () => {
  const text = document.getElementById("generated-prompt").textContent;
  await navigator.clipboard.writeText(text);
  const confirmation = document.getElementById("copy-confirmation");
  confirmation.style.display = "inline";
  setTimeout(() => {
    confirmation.style.display = "none";
  }, 2000);
});

// ── Quick-start chips (intent screen) ─────────────────────────────────────
// UI-only helper: clicking a chip fills the intent textarea and enables the
// Continue button. Mirrors the existing 'input' handler's enable logic.

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const input = document.getElementById("fallback-intent-input");
    input.value = chip.dataset.chip || chip.textContent;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  });
});

// ── Step-progress mirror (question screen) ────────────────────────────────
// Watches #progress-text (which mcq.js rewrites as "Question N of M") and
// reflects the position into the visual progress bar. Purely UI display —
// the underlying question flow is untouched.

const stepProgressEl = document.getElementById("question-step-progress");
if (stepProgressEl) {
  const stepNumEl   = stepProgressEl.querySelector(".step-num");
  const stepTotalEl = stepProgressEl.querySelector(".step-total");
  const stepFillEl  = stepProgressEl.querySelector(".step-bar-fill");

  const sync = () => {
    const text = document.getElementById("progress-text").textContent || "";
    const match = text.match(/Question\s+(\d+)\s+of\s+(\d+)/i);
    if (!match) return;
    const current = parseInt(match[1], 10);
    const total   = parseInt(match[2], 10);
    stepNumEl.textContent   = String(current);
    stepTotalEl.textContent = String(total);
    stepFillEl.style.width  = `${Math.round((current / total) * 100)}%`;
  };

  new MutationObserver(sync).observe(
    document.getElementById("progress-text"),
    { childList: true, characterData: true, subtree: true }
  );
  sync();
}

// ── Question screen: auto-show input for no-options questions + auto-grow ──
new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== 1) continue;

      // For questions with no MCQ options, skip the "Something else..." button
      // and show the input directly.
      if (node.classList.contains('option-else-btn')) {
        const hasOptions = document.getElementById('options-container')
          .querySelectorAll('.option-btn').length > 0;
        if (!hasOptions) node.click();
        continue;
      }

      // Find a newly added .else-input <input> and replace it with a growing textarea.
      const raw = node.classList.contains('else-input') ? node
        : node.querySelector?.('.else-input');
      if (!raw || raw.tagName !== 'INPUT') continue;

      const hasOptions = document.getElementById('options-container')
        .querySelectorAll('.option-btn').length > 0;

      const ta = document.createElement('textarea');
      ta.className = raw.className;
      ta.placeholder = hasOptions ? raw.placeholder : 'Type your answer here...';
      ta.value = raw.value;
      ta.rows = 1;
      ta.style.resize = 'none';
      ta.style.overflow = 'hidden';

      const grow = () => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
        raw.value = ta.value; // keep hidden input synced for mcq.js submit closure
      };
      ta.addEventListener('input', grow);

      // Enter (without Shift) submits; Shift+Enter inserts a newline
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          raw.value = ta.value;
          raw.closest('.else-input-wrapper')?.querySelector('.else-done-btn')?.click();
        }
      });

      // Keep the original <input> in the DOM (hidden) so mcq.js submit closure reads it
      raw.style.display = 'none';
      raw.after(ta);
      ta.focus();
      grow();
    }
  }
}).observe(document.getElementById('options-container'), { childList: true, subtree: true });

