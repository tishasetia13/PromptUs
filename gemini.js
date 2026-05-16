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

function getPlatformCategory(platform) {
  const p = (platform || "").toLowerCase();

  const imageTools = ["midjourney", "ideogram", "flux", "stable diffusion", "leonardo", "firefly", "dalle", "dall-e", "nightcafe", "adobe firefly", "playground"];
  const videoTools = ["sora", "veo", "runway", "pika", "kling", "hailuo", "luma", "dream machine"];
  const webTools = ["lovable", "bolt", "v0", "vercel", "framer", "webflow", "bubble"];
  const textTools = ["chatgpt", "claude", "gemini", "copilot", "perplexity", "character.ai"];

  if (imageTools.some(t => p.includes(t))) return "image";
  if (videoTools.some(t => p.includes(t))) return "video";
  if (webTools.some(t => p.includes(t))) return "web";
  if (textTools.some(t => p.includes(t))) return "text";
  return "image"; // default fallback — most users will be on image tools
}

const CATEGORY_BLOCKS = {
  image:
    `Great AI image prompts cover these dimensions:\n` +
    `- Subject: the focal point — who or what, with specific physical details\n` +
    `- Setting / Environment: where the scene takes place, surroundings, time period\n` +
    `- Composition: camera angle, framing, perspective (close-up, wide shot, bird's eye, macro)\n` +
    `- Lighting: quality, direction, colour, time of day (golden hour, neon, candlelit, overcast)\n` +
    `- Style / Medium: photorealistic, oil painting, anime, 3D render, watercolour, cinematic\n` +
    `- Mood / Atmosphere: emotional tone (melancholy, intense, serene, dreamlike)\n` +
    `- Colour palette: dominant colours, saturation level, warm vs cool tones\n` +
    `- Level of detail: minimalist and clean vs intricate and busy\n` +
    `Focus your questions on whichever of these dimensions the user has left unspecified.`,

  video:
    `Great AI video prompts cover these dimensions:\n` +
    `- Subject and action: who or what is in the scene and exactly what are they doing (movement matters)\n` +
    `- Camera motion: static, slow push in, orbit, tracking shot, handheld, drone pull-back\n` +
    `- Setting and time: where, when, what surrounds the subject\n` +
    `- Duration and pacing: slow and cinematic vs fast and energetic\n` +
    `- Lighting and time of day: golden hour, night with artificial light, overcast, studio\n` +
    `- Mood and tone: the emotional feeling the video should leave the viewer with\n` +
    `- Style: live action realistic, animated, stop motion, cinematic film, documentary\n` +
    `Focus your questions on motion, camera behaviour, and time-based elements — these matter more for video than for images.`,

  web:
    `Great AI web/app generation prompts cover these dimensions:\n` +
    `- Purpose: what does this product do and who is it for\n` +
    `- Visual style: minimal and clean, bold and colourful, corporate, playful, luxury\n` +
    `- Key screens or sections needed: landing page, dashboard, profile, onboarding, etc.\n` +
    `- Colour scheme and typography preferences\n` +
    `- Tone of the copy: professional, casual, witty, inspirational\n` +
    `- Interaction style: simple and static, or interactive with animations\n` +
    `Focus your questions on helping the user clarify purpose, audience, and visual direction.`,

  text:
    `Great AI text prompts cover these dimensions:\n` +
    `- Goal: what should the output achieve or make the reader feel\n` +
    `- Audience: who will read this and what do they already know\n` +
    `- Tone: formal, conversational, witty, persuasive, empathetic\n` +
    `- Format: paragraph, bullet points, dialogue, story, step-by-step\n` +
    `- Length and depth: short and punchy vs thorough and detailed\n` +
    `- Style reference: any specific writer, brand, or example to emulate\n` +
    `Focus your questions on helping the user clarify their goal and audience.`,
};

export async function generateQuestions(platform, userIntent) {
  console.log("userIntent received:", userIntent);
  const apiKey = await getApiKey();
  if (!apiKey)
    throw new Error(
      "No API key saved. Please add your Gemini API key in Settings."
    );

  const category     = getPlatformCategory(platform);
  const platformLabel = platform || "AI generation tools";
  const intentText   = (userIntent || "").trim() || "a creative piece";
  const categoryBlock = CATEGORY_BLOCKS[category] || CATEGORY_BLOCKS.text;

  const prompt =
    `You are a world-class prompt engineer and creative director who specialises in getting the best results out of AI ${category} generation tools like ${platformLabel}.\n\n` +
    `Your role right now is to act as a creative director interviewing a client. The client has described what they want to create. Your job is to ask them the RIGHT questions — the ones that surface the missing details needed to write a truly excellent prompt for an AI ${category} generator.\n\n` +
    `## THE USER'S INTENT\n` +
    `The user wants to create: "${intentText}"\n\n` +
    `## WHAT MAKES A GREAT AI ${category.toUpperCase()} GENERATION PROMPT\n` +
    `${categoryBlock}\n\n` +
    `## YOUR TASK\n` +
    `1. Silently analyse the user's intent. Assess its complexity on a scale of 1-10. A vague intent like "a dog" is a 2. A detailed intent like "a cyberpunk samurai on a rooftop at midnight with neon rain" is an 8.\n` +
    `2. Decide how many questions to ask:\n` +
    `   - Complexity 1-3: ask 5-6 questions (intent is vague, you need to flesh it out)\n` +
    `   - Complexity 4-6: ask 3-4 questions (fill the gaps)\n` +
    `   - Complexity 7-10: ask 2-3 questions (refine the remaining ambiguities only)\n` +
    `3. Only ask about dimensions the user has NOT already specified. Never ask something they already told you.\n` +
    `4. Every question must be SPECIFIC to the user's actual idea — never generic. If they said "bookstore cafe", your questions must mention cafes, books, shelves, lighting — not abstract categories.\n` +
    `5. Each question must have exactly 4 options that are: concrete and visual, meaningfully different from each other, and phrased in plain language a non-expert would understand.\n\n` +
    `## OUTPUT FORMAT — CRITICAL\n` +
    `Return ONLY a raw JSON array. No markdown. No code fences. No explanation. No text before or after.\n` +
    `[\n` +
    `  {\n` +
    `    "question": "Your specific question here?",\n` +
    `    "options": ["Option A", "Option B", "Option C", "Option D"]\n` +
    `  }\n` +
    `]\n` +
    `Return between 2 and 7 objects. Nothing outside the JSON array.`;

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
