// popup.js
// Runs every time the popup is opened. Coordinates all screens and wires
// up navigation between auth → welcome → questions → anything-else → summary.

import { showQuestion, showSummary, currentQuestionIndex, userAnswers, activeQuestions } from "./mcq.js";
import { generateQuestions, generatePrompt } from "./gemini.js";
import { signInWithGoogle, getCurrentUser } from "./auth.js";
import { syncUser, incrementUsage } from "./db.js";

console.log("Prompt Assistant popup loaded successfully!");

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

// ── Auth gate: runs immediately on every popup open ────────────────────────
// Shows the sign-in screen if there's no saved user, otherwise proceeds
// straight to the normal intent flow.

let currentUser = null; // holds the signed-in user for the whole session

(async () => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      // No user — show the auth screen, keep main-screen hidden
      document.getElementById("auth-section").style.display = "block";
      document.getElementById("main-screen").style.display  = "none";
      return;
    }

    // User is already signed in — proceed with the normal startup flow
    currentUser = user;
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("main-screen").style.display  = "block";
    await runStartupPrefill();
  } catch (err) {
    // If the auth check itself fails, show the sign-in screen as a safe fallback
    console.error("Auth gate error:", err);
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("main-screen").style.display  = "none";
  }
})();

// ── Sign-in button ─────────────────────────────────────────────────────────

document.getElementById("signin-btn").addEventListener("click", async () => {
  const btn     = document.getElementById("signin-btn");
  const errorEl = document.getElementById("auth-error");

  btn.disabled    = true;
  btn.textContent = "Signing in...";
  errorEl.style.display = "none";

  try {
    // 1. Get Google token + profile via Chrome identity API
    const googleUser = await signInWithGoogle();

    // 2. Sync with Supabase — creates row if new, fetches it if returning
    const dbUser = await syncUser(googleUser.google_id, googleUser.email, googleUser.name);

    // 3. Merge DB data (usage_count, is_pro) into the saved user object
    const fullUser = { ...googleUser, ...dbUser };
    await chrome.storage.local.set({ promptus_user: fullUser });
    currentUser = fullUser;

    // 4. Show the main app
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("main-screen").style.display  = "block";
    await runStartupPrefill();

  } catch (err) {
    errorEl.textContent   = `Sign-in failed: ${err.message}`;
    errorEl.style.display = "block";
    btn.disabled          = false;
    btn.textContent       = "Sign in with Google";
  }
});

// ── Startup: pre-fill intent from active tab if available ─────────────────
// Extracted into a function so both the "already signed in" and
// "just signed in" paths can call it.

async function runStartupPrefill() {
  let prefill = "";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { action: "getIntent" });
      prefill = (response?.intent || "").trim();
    }
  } catch (_) {}

  if (!prefill) {
    showSection("intent-fallback-section");
    return;
  }

  document.getElementById("fallback-intent-input").value = prefill;
  document.getElementById("fallback-start-btn").disabled = false;
  userIntent = prefill;
  showSection("category-section");
}

// ── Question-section loading helpers ──────────────────────────────────────

function showQuestionsLoading() {
  document.getElementById("questions-loading").style.display  = "flex";
  document.getElementById("progress-text").style.display      = "none";
  document.getElementById("question-text").style.display      = "none";
  document.getElementById("options-container").style.display  = "none";
}

function hideQuestionsLoading() {
  document.getElementById("questions-loading").style.display  = "none";
  document.getElementById("progress-text").style.display      = "block";
  document.getElementById("question-text").style.display      = "block";
  document.getElementById("options-container").style.display  = "block";
}

// ── MCQ flow navigation ────────────────────────────────────────────────────

let userIntent = "";
let selectedCategory = { name: "AI text tools like ChatGPT, Claude, and Gemini", category: "text" };

const ICON_TEXT   = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="16" y2="12"/><line x1="4" y1="17" x2="11" y2="17"/></svg>`;
const ICON_IMAGE  = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="1.6"/><path d="M3 17l5-5 4 4 3-3 6 6"/></svg>`;
const ICON_VIDEO  = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3z"/></svg>`;
const ICON_WEBDEV = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 8 3 12 8 16"/><polyline points="16 8 21 12 16 16"/><line x1="14" y1="5" x2="10" y2="19"/></svg>`;

const CATEGORIES = [
  { key: 'text',   icon: ICON_TEXT,   label: 'Text',   desc: 'Long-form, chat, code, analysis',      name: 'AI text tools like ChatGPT, Claude, and Gemini' },
  { key: 'image',  icon: ICON_IMAGE,  label: 'Image',  desc: 'Stills, illustrations, photography',   name: 'AI image generators like Midjourney, DALL·E, and Flux' },
  { key: 'video',  icon: ICON_VIDEO,  label: 'Video',  desc: 'Motion, cinematics, b-roll',            name: 'AI video generators like Sora, Kling, and Seedance' },
  { key: 'webdev', icon: ICON_WEBDEV, label: 'Webdev', desc: 'Apps, sites, components',               name: 'AI app builders like Lovable, Bolt, and v0' },
];

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

document.getElementById("fallback-intent-input").addEventListener("input", (e) => {
  document.getElementById("fallback-start-btn").disabled =
    e.target.value.replace(/\s/g, "").length < 3;
});

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
  showQuestion(currentQuestionIndex);
});

document.getElementById("to-summary-btn").addEventListener("click", () => {
  showSection("summary-section");
  showSummary();
});

document.getElementById("summary-back-btn").addEventListener("click", () => {
  showSection("anything-else-section");
});

// ── Generate button: enforce free tier, then call Gemini ─────────────────

document.getElementById("generate-btn").addEventListener("click", async () => {
  // Reference the button locally — safe even if other parts of the script failed
  const generateBtn = document.getElementById("generate-btn");

  // ── Check usage limit before doing anything ───────────────────────────
  try {
    const newCount = await incrementUsage(currentUser.google_id);

    // Re-fetch is_pro in case it changed since sign-in
    const { promptus_user } = await chrome.storage.local.get("promptus_user");
    const isPro = promptus_user?.is_pro || false;

    if (newCount > 10 && !isPro) {
      // Over the limit — show paywall, hide generate button
      document.getElementById("paywall-section").style.display = "block";
      generateBtn.style.display = "none";
      return; // stop here — do NOT call Gemini
    }
  } catch (err) {
    // If usage tracking fails, fail open (don't block the user)
    console.warn("Usage tracking error:", err.message);
  }

  // ── Normal generation flow ────────────────────────────────────────────
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
    generateBtn.disabled    = true;
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
  setTimeout(() => { confirmation.style.display = "none"; }, 2000);
});

// ── Quick-start chips ─────────────────────────────────────────────────────

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const input = document.getElementById("fallback-intent-input");
    input.value = chip.dataset.chip || chip.textContent;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  });
});

// ── Step-progress mirror ──────────────────────────────────────────────────

const stepProgressEl = document.getElementById("question-step-progress");
if (stepProgressEl) {
  const stepNumEl   = stepProgressEl.querySelector(".step-num");
  const stepTotalEl = stepProgressEl.querySelector(".step-total");
  const stepFillEl  = stepProgressEl.querySelector(".step-bar-fill");

  const sync = () => {
    const text  = document.getElementById("progress-text").textContent || "";
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

// ── Question screen: auto-show input + auto-grow textarea ─────────────────

new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== 1) continue;

      if (node.classList.contains('option-else-btn')) {
        const hasOptions = document.getElementById('options-container')
          .querySelectorAll('.option-btn').length > 0;
        if (!hasOptions) node.click();
        continue;
      }

      const raw = node.classList.contains('else-input') ? node
        : node.querySelector?.('.else-input');
      if (!raw || raw.tagName !== 'INPUT') continue;

      const hasOptions = document.getElementById('options-container')
        .querySelectorAll('.option-btn').length > 0;

      const ta = document.createElement('textarea');
      ta.className    = raw.className;
      ta.placeholder  = hasOptions ? raw.placeholder : 'Type your answer here...';
      ta.value        = raw.value;
      ta.rows         = 1;
      ta.style.resize   = 'none';
      ta.style.overflow = 'hidden';

      const grow = () => {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
        raw.value = ta.value;
      };
      ta.addEventListener('input', grow);

      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          raw.value = ta.value;
          raw.closest('.else-input-wrapper')?.querySelector('.else-done-btn')?.click();
        }
      });

      raw.style.display = 'none';
      raw.after(ta);
      ta.focus();
      grow();
    }
  }
}).observe(document.getElementById('options-container'), { childList: true, subtree: true });
