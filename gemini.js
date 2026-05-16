// gemini.js — Gemini API calls for question and prompt generation

import { getApiKey } from "./settings.js";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function stripFences(text) {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

async function callGemini(apiKey, prompt, generationConfig) {
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.error?.message || `Gemini API error ${res.status}: ${res.statusText}`
    );
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

export async function generateQuestions(platform) {
  const apiKey = await getApiKey();
  if (!apiKey)
    throw new Error(
      "No API key saved. Please add your Gemini API key in Settings."
    );

  const prompt =
    `You are an expert AI prompt engineer specializing in ${platform}. ` +
    `Your job is to ask the user smart questions to understand exactly what ` +
    `they want to create, so you can later generate the best possible ${platform} prompt.\n\n` +
    `Generate exactly 4 questions that will give you the most useful information ` +
    `for writing a great ${platform} prompt. Make the questions specific to how ` +
    `${platform} works — think about what parameters, styles, and details actually ` +
    `matter for this platform.\n\n` +
    `Return ONLY a valid JSON array with exactly this structure, no other text:\n` +
    `[\n` +
    `  {\n` +
    `    "question": "the question text",\n` +
    `    "options": ["option 1", "option 2", "option 3", "option 4"]\n` +
    `  }\n` +
    `]`;

  const text = await callGemini(apiKey, prompt, {
    temperature: 0.7,
  });

  const cleaned = stripFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    console.error("Raw Gemini response:", text);
    throw new Error("Failed to parse AI response. Please try again.");
  }
}

export async function generatePrompt(platform, answers, extraNotes) {
  const apiKey = await getApiKey();
  if (!apiKey)
    throw new Error(
      "No API key saved. Please add your Gemini API key in Settings."
    );

  const prompt =
    `You are a world-class prompt engineer specializing in ${platform}. ` +
    `Based on the user's answers below, generate the single best possible ${platform} prompt.\n\n` +
    `The prompt should:\n` +
    `- Use the most effective structure and syntax for ${platform}\n` +
    `- Include the right technical parameters and style keywords that ${platform} responds best to\n` +
    `- Be detailed enough to get an excellent result but not overwhelming\n` +
    `- Feel professional and polished, not like a beginner wrote it\n\n` +
    `User's answers:\n${answers}\n\n` +
    `Extra notes from user: ${extraNotes || "None"}\n\n` +
    `Return ONLY the final prompt text, nothing else. No explanations, no labels, just the prompt itself.`;

  const text = await callGemini(apiKey, prompt, { temperature: 0.7 });
  return stripFences(text);
}
