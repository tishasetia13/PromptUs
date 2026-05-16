// mcq.js — MCQ flow state and rendering

export let currentQuestionIndex = 0;
export let userAnswers = [];
export let userIntent = "";

// Starts as the hardcoded fallback; replaced with AI questions on first showQuestion call
export let activeQuestions = [
  {
    question: "What's the main subject?",
    options: ["A person", "An animal", "A landscape", "An object"],
  },
  {
    question: "What's the overall style?",
    options: ["Photorealistic", "Cinematic", "Anime / Illustrated", "Oil painting"],
  },
  {
    question: "What's the mood or feeling?",
    options: ["Dramatic & intense", "Calm & peaceful", "Dark & mysterious", "Bright & joyful"],
  },
  {
    question: "What's the lighting like?",
    options: ["Golden hour sunlight", "Neon / artificial", "Soft studio light", "Dark with shadows"],
  },
];

// Pass the AI-generated questions array on the first call; subsequent recursive
// calls omit it and reuse the stored activeQuestions.
export function showQuestion(index, questions, intent) {
  if (questions) activeQuestions = questions;
  if (intent !== undefined) userIntent = intent;
  currentQuestionIndex = index;

  const q = activeQuestions[index];

  document.getElementById("progress-text").textContent =
    `Question ${index + 1} of ${activeQuestions.length}`;
  document.getElementById("question-text").textContent = q.question;

  const container = document.getElementById("options-container");
  container.innerHTML = "";

  q.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = option;
    btn.addEventListener("click", () => {
      userAnswers[index] = option;
      if (index + 1 < activeQuestions.length) {
        showQuestion(index + 1);
      } else {
        document.getElementById("question-section").style.display = "none";
        document.getElementById("anything-else-section").style.display = "block";
      }
    });
    container.appendChild(btn);
  });
}

// Populates #summary-content using actual question text as labels.
export function showSummary() {
  const extraText = document.getElementById("extra-input").value.trim();

  const container = document.getElementById("summary-content");
  container.innerHTML = "";

  activeQuestions.forEach((q, i) => {
    const answer = userAnswers[i] || "—";
    const row = document.createElement("div");
    row.className = "summary-row";
    row.innerHTML =
      `<span class="summary-label">${q.question}</span>` +
      `<span class="summary-answer">${answer}</span>`;
    container.appendChild(row);
  });

  if (extraText) {
    const row = document.createElement("div");
    row.className = "summary-row";
    row.innerHTML =
      `<span class="summary-label">Extra notes</span>` +
      `<span class="summary-answer">${extraText}</span>`;
    container.appendChild(row);
  }
}
