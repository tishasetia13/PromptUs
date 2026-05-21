// popup.js
// Runs every time the popup is opened. Coordinates all screens and wires
// up navigation between welcome → questions → anything-else → summary,
// plus the settings overlay and Gemini API calls.

import { getApiKey, saveApiKey } from "./settings.js";
import { showQuestion, showSummary, currentQuestionIndex, userAnswers, activeQuestions } from "./mcq.js";
import { generateQuestions, generatePrompt } from "./gemini.js";

console.log("Prompt Assistant popup loaded successfully!");

// ── Element references ──────────────────────────────────────────────────────

const mainScreen          = document.getElementById("main-screen");
const settingsScreen      = document.getElementById("settings-screen");
const settingsBtn         = document.getElementById("settings-btn");
const backFromSettingsBtn = document.getElementById("back-from-settings-btn");
const apiKeyInput         = document.getElementById("api-key-input");
const saveKeyBtn          = document.getElementById("save-key-btn");
const saveStatus          = document.getElementById("save-status");
const generateBtn         = document.getElementById("generate-btn");

// ── Section switcher (within main-screen) ──────────────────────────────────

const SECTIONS = [
  "intent-fallback-section",
  "question-section",
  "anything-else-section",
  "summary-section",
];

function showSection(id) {
  SECTIONS.forEach((s) => {
    document.getElementById(s).style.display = s === id ? "block" : "none";
  });
}

// ── Settings overlay helpers ───────────────────────────────────────────────

function showSettingsScreen() {
  mainScreen.style.display = "none";
  settingsBtn.style.display = "none";
  settingsScreen.style.display = "block";
}

function showMainScreen() {
  settingsScreen.style.display = "none";
  mainScreen.style.display = "block";
  settingsBtn.style.display = "";
}

// ── On load: send first-time users to settings if no API key is saved ──────
// Also checks for an intent pre-filled by the floating button and auto-starts
// the question flow if one is found, skipping the welcome screen.

getApiKey().then(async (key) => {
  if (!key) {
    showSettingsScreen();
    return;
  }

  const stored = await chrome.storage.local.get(["__pa_intent__", "__pa_category__"]);
  const prefill = (stored.__pa_intent__ || "").trim();

  // No prefill — show the fallback input screen (it's the default visible section)
  if (!prefill) return;

  await chrome.storage.local.remove(["__pa_intent__", "__pa_category__"]);

  // Apply the category chosen on the floating pill
  if (stored.__pa_category__) {
    const CAT_MAP = {
      text:   { name: "AI text tools like ChatGPT, Claude, and Gemini",        category: "text"   },
      image:  { name: "AI image generators like Midjourney, DALL·E, and Flux", category: "image"  },
      video:  { name: "AI video generators like Sora, Kling, and Seedance",    category: "video"  },
      webdev: { name: "AI app builders like Lovable, Bolt, and v0",            category: "webdev" },
    };
    const cat = CAT_MAP[stored.__pa_category__];
    if (cat) selectedCategory = cat;
  }

  // Pre-fill the fallback input so Back from question 0 shows the intent
  document.getElementById("fallback-intent-input").value = prefill;
  document.getElementById("fallback-start-btn").disabled = false;

  await startQuestionsFlow(prefill);
});

// ── Settings overlay events ────────────────────────────────────────────────

settingsBtn.addEventListener("click", async () => {
  const key = await getApiKey();
  apiKeyInput.value = key ? "••••••••" : "";
  saveStatus.textContent = "";
  showSettingsScreen();
});

saveKeyBtn.addEventListener("click", async () => {
  const val = apiKeyInput.value;
  if (val && val !== "••••••••") {
    await saveApiKey(val);
    saveStatus.textContent = "✅ Key saved!";
  }
});

backFromSettingsBtn.addEventListener("click", () => {
  showMainScreen();
});

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

// Enable/disable Continue based on fallback input
document.getElementById("fallback-intent-input").addEventListener("input", (e) => {
  document.getElementById("fallback-start-btn").disabled =
    e.target.value.replace(/\s/g, "").length < 3;
});

// Continue from fallback screen
document.getElementById("fallback-start-btn").addEventListener("click", () => {
  startQuestionsFlow(document.getElementById("fallback-intent-input").value.trim());
});

document.getElementById("on-back-btn").addEventListener("click", () => {
  if (currentQuestionIndex === 0) {
    showSection("intent-fallback-section");
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
  generateBtn.textContent = "✨ Generating...";

  const formattedAnswers = activeQuestions
    .map((q, i) => `${q.question}: ${userAnswers[i] || "—"}`)
    .join("\n");
  const extraNotes = document.getElementById("extra-input").value.trim();

  try {
    const promptText = await generatePrompt(selectedCategory.name, userIntent, formattedAnswers, extraNotes, selectedCategory.category);
    generateBtn.classList.remove("loading");
    generateBtn.textContent = "✨ Generate My Prompt";
    document.getElementById("generated-prompt").textContent = promptText;
    document.getElementById("result-section").style.display = "block";
    chrome.storage.local.set({ __pa_prompt__: promptText });
  } catch (err) {
    generateBtn.classList.remove("loading");
    generateBtn.textContent = "✨ Generate My Prompt";
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

