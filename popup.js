// popup.js
// Runs every time the popup is opened. Coordinates all screens and wires
// up navigation between welcome → questions → anything-else → summary,
// plus the settings overlay and Gemini API calls.

import { getApiKey, saveApiKey } from "./settings.js";
import { showQuestion, showSummary, currentQuestionIndex, userAnswers, activeQuestions } from "./mcq.js";
import { generateQuestions, generatePrompt } from "./gemini.js";

console.log("Prompt Assistant popup loaded successfully!");

// ── Element references ──────────────────────────────────────────────────────

const statusEl            = document.getElementById("platform-status");
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
  "welcome-section",
  "intent-section",
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

getApiKey().then((key) => {
  if (!key) showSettingsScreen();
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

document.getElementById("start-btn").addEventListener("click", () => {
  showSection("intent-section");
});

document.getElementById("intent-back-btn").addEventListener("click", () => {
  showSection("welcome-section");
});

document.getElementById("intent-input").addEventListener("input", (e) => {
  document.getElementById("intent-continue-btn").disabled =
    e.target.value.replace(/\s/g, "").length < 3;
});

document.getElementById("intent-continue-btn").addEventListener("click", async () => {
  userIntent = document.getElementById("intent-input").value.trim();
  showSection("question-section");
  showQuestionsLoading();

  try {
    const aiQuestions = await generateQuestions("Midjourney", userIntent);
    hideQuestionsLoading();
    showQuestion(0, aiQuestions, userIntent);
  } catch (err) {
    alert(`Could not generate questions: ${err.message}`);
    showSection("intent-section");
  }
});

document.getElementById("on-back-btn").addEventListener("click", () => {
  if (currentQuestionIndex === 0) {
    showSection("intent-section");
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
    const promptText = await generatePrompt("Midjourney", formattedAnswers, extraNotes);
    generateBtn.classList.remove("loading");
    generateBtn.textContent = "✨ Generate My Prompt";
    document.getElementById("generated-prompt").textContent = promptText;
    document.getElementById("result-section").style.display = "block";
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

// ── Phase 1: platform detection ────────────────────────────────────────────
// Queries the active tab's content script and updates the welcome badge.

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const activeTab = tabs[0];

  if (!activeTab) {
    showNotDetected();
    return;
  }

  chrome.tabs.sendMessage(
    activeTab.id,
    { action: "getPlatform" },
    function (response) {
      if (chrome.runtime.lastError) {
        showNotDetected();
        return;
      }

      if (response && response.platform === "midjourney") {
        statusEl.textContent = "You're on Midjourney ✨";
        statusEl.classList.add("detected");
      } else {
        showNotDetected();
      }
    }
  );
});

function showNotDetected() {
  statusEl.textContent = "❌ No supported AI platform detected on this tab";
  statusEl.classList.add("not-detected");
}
