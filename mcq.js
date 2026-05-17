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

  const advanceFromAnswer = (answer) => {
    userAnswers[index] = answer;
    if (index + 1 < activeQuestions.length) {
      showQuestion(index + 1);
    } else {
      document.getElementById("question-section").style.display = "none";
      document.getElementById("anything-else-section").style.display = "block";
    }
  };

  const savedAnswer = userAnswers[index];
  const isCustomAnswer = savedAnswer && !q.options.includes(savedAnswer);

  q.options.forEach((option) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = option;
    if (option === savedAnswer) btn.classList.add("selected");
    btn.addEventListener("click", () => advanceFromAnswer(option));
    container.appendChild(btn);
  });

  const showInlineInput = (prefillValue) => {
    const wrapper = document.createElement("div");
    wrapper.className = "else-input-wrapper";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "else-input";
    input.placeholder = "Type your answer…";
    if (prefillValue) input.value = prefillValue;

    const doneBtn = document.createElement("button");
    doneBtn.className = "else-done-btn";
    doneBtn.textContent = "Done";

    const submit = () => {
      const val = input.value.trim();
      if (!val) return;
      advanceFromAnswer(val);
    };

    doneBtn.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

    wrapper.appendChild(input);
    wrapper.appendChild(doneBtn);
    container.appendChild(wrapper);
    input.focus();
  };

  const elseBtn = document.createElement("button");
  elseBtn.className = "option-else-btn";
  elseBtn.textContent = "Something else...";
  elseBtn.addEventListener("click", () => {
    elseBtn.remove();
    showInlineInput(null);
  });
  container.appendChild(elseBtn);

  if (isCustomAnswer) {
    elseBtn.remove();
    showInlineInput(savedAnswer);
  }
}

// Populates #summary-content using actual question text as labels.
export function showSummary() {
  const extraText = document.getElementById("extra-input").value.trim();

  const container = document.getElementById("summary-content");
  container.innerHTML = "";

  if (userIntent) {
    const row = document.createElement("div");
    row.className = "summary-row";
    row.innerHTML =
      `<span class="summary-label">What I want to create</span>` +
      `<span class="summary-answer">${userIntent}</span>`;
    container.appendChild(row);
  }

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
