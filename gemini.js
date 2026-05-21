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


const CATEGORY_BLOCKS = {
  text:
    `A world-class text prompt is built from these layers, ordered foundational → refining. Probe them in this order:\n\n` +
    `FOUNDATIONAL (the WHAT):\n` +
    `- Task: the specific action — write, summarise, rewrite, brainstorm, analyse, explain, draft, translate. The verb matters.\n` +
    `- Context: the situation or background — what's this for, what came before, what's the bigger picture.\n` +
    `- Audience: who will read it and what they already know.\n\n` +
    `STRUCTURAL (the SHAPE):\n` +
    `- Output Format: paragraphs, bullets, table, dialogue, email, outline, JSON, step-by-step.\n` +
    `- Constraints: length, what to avoid, banned words, must-include points, reading level.\n` +
    `- Tone / Voice: formal, conversational, witty, persuasive, empathetic, authoritative.\n\n` +
    `REFINING (the POLISH):\n` +
    `- Role: any persona the AI should adopt (senior engineer, friendly teacher, no-nonsense editor).\n` +
    `- Examples: a sample of what "good" looks like — a sentence, a paragraph, a reference writer or brand.\n` +
    `- Success criteria: how the user will know the output is right.`,

  image:
    `A world-class image prompt is built from these dimensions, ordered foundational → refining:\n\n` +
    `FOUNDATIONAL:\n` +
    `- Subject: the focal point — who or what, with specific physical details.\n` +
    `- Setting / Environment: where it takes place, surroundings, time period.\n\n` +
    `STRUCTURAL:\n` +
    `- Composition: framing and angle (close-up, wide shot, bird's eye, macro, over-the-shoulder).\n` +
    `- Lighting: quality and direction (golden hour, neon, candlelit, harsh studio, overcast).\n` +
    `- Style / Medium: photorealistic, oil painting, 3D render, watercolour, cinematic still.\n\n` +
    `REFINING:\n` +
    `- Mood / Atmosphere: emotional tone (melancholy, intense, serene, dreamlike).\n` +
    `- Colour palette: dominant colours, saturation, warm vs cool.\n` +
    `- Level of detail: minimalist and clean vs intricate and busy.`,

  video:
    `A world-class video prompt is built from these dimensions, ordered foundational → refining. Motion is paramount — video lives or dies on action and camera:\n\n` +
    `FOUNDATIONAL:\n` +
    `- Subject + action: who or what, and EXACTLY what they are doing. Movement is the heart of video.\n` +
    `- Environment + time of day: where and when (golden hour, midnight neon, overcast afternoon, studio).\n\n` +
    `STRUCTURAL:\n` +
    `- Camera motion: static, slow push-in, orbit, tracking shot, handheld, drone pull-back. This defines the feel of the shot.\n` +
    `- Visual style: cinematic film, anime, raw documentary, stylised illustration.\n` +
    `- Duration: 5 seconds (single punchy moment) or 10 seconds (small arc of action).\n` +
    `- Aspect ratio: 16:9 (landscape), 9:16 (vertical), 1:1 (square).\n\n` +
    `REFINING:\n` +
    `- Mood / tone: tense, serene, melancholic, euphoric.\n` +
    `- Lighting nuance: specific quality and colour of light beyond time of day.`,

  webdev:
    `A world-class app-builder prompt (for tools like Lovable, v0, Bolt) is built from these dimensions, ordered foundational → refining:\n\n` +
    `FOUNDATIONAL:\n` +
    `- Core purpose: what does the app do, in one concrete sentence.\n` +
    `- Target user: who is this for — a consumer, a business, a niche group, a specific profession.\n\n` +
    `STRUCTURAL:\n` +
    `- Pages / screens needed: landing, dashboard, login, profile, settings, pricing, onboarding.\n` +
    `- Key features: auth, payments, data tables, real-time updates, animations, AI features, integrations.\n` +
    `- Tech stack preference: React, Next.js, Tailwind, Supabase — or "let the tool decide".\n\n` +
    `REFINING:\n` +
    `- Visual style: minimal, bold, dark mode, playful, corporate, luxury.\n` +
    `- Tone of copy: professional, casual, witty, inspirational.\n` +
    `- Interaction style: static vs animated, simple vs rich micro-interactions.`,

  // 'web' is a legacy alias — keep it pointing at webdev for safety
  get web() { return this.webdev; },
};

export async function generateQuestions(platformName, userIntent, category) {
  console.log("userIntent received:", userIntent);
  const apiKey = await getApiKey();
  if (!apiKey)
    throw new Error(
      "No API key saved. Please add your Gemini API key in Settings."
    );

  const platformLabel = platformName || "AI generation tools";
  const intentText   = (userIntent || "").trim() || "a creative piece";
  const categoryBlock = CATEGORY_BLOCKS[category] || CATEGORY_BLOCKS.text;

  const prompt =
    `You are a senior creative director conducting a pre-brief interview with a client. The client wants to make something using an AI ${category} tool (like ${platformLabel}). Your job is to surface the missing information needed to write a world-class final prompt for them — but only what's genuinely missing, asked in the right order.\n\n` +
    `## THE CLIENT'S BRIEF\n` +
    `"${intentText}"\n\n` +
    `## WHAT A GREAT AI ${category.toUpperCase()} PROMPT CONTAINS\n` +
    `${categoryBlock}\n\n` +
    `═══════════════════════════════════════════════════════════════\n` +
    `## YOUR INTERNAL WORKFLOW — FOLLOW THESE STEPS IN ORDER\n` +
    `═══════════════════════════════════════════════════════════════\n\n` +
    `### STEP 1 — INVENTORY\n` +
    `Read the brief and list (silently, in your head) every dimension from the section above. For each one, mark it as:\n` +
    `   ✓ COVERED — the user already gave you this\n` +
    `   ~ HINTED — the user implied this but didn't state it directly\n` +
    `   ✗ MISSING — the user gave you nothing on this dimension\n\n` +
    `### STEP 2 — ASSESS COMPLETENESS\n` +
    `Ask yourself: "Is this brief complete enough to write a world-class ${category} prompt right now?"\n` +
    `   - If YES → return [] (an empty array). Stop. Do not invent questions.\n` +
    `   - If NO → proceed to Step 3.\n\n` +
    `A brief is "complete enough" when the user has covered the foundational dimensions (the WHAT and the WHO/WHY) even if some refinements are missing — you can make tasteful inferences for the rest.\n\n` +
    `### STEP 3 — PRIORITISE THE GAPS\n` +
    `From your MISSING and HINTED list, sort the gaps from FOUNDATIONAL to REFINING. You will ask FOUNDATIONAL questions first, then STRUCTURAL, then REFINING. Never the other way around. A user should feel the interview starts where they are and gradually zooms in.\n\n` +
    `### STEP 4 — DECIDE HOW MANY QUESTIONS TO ASK\n` +
    `There is no required number. Use judgement:\n` +
    `   - If only one foundational thing is missing, one question is enough.\n` +
    `   - If multiple dimensions are missing, ask more — but stop the moment you have enough to write a great prompt. Do not pad.\n` +
    `   - Never ask about something the user already told you or clearly implied.\n\n` +
    `### STEP 5 — WRITE EACH QUESTION\n` +
    `For each gap you're asking about:\n\n` +
    `   (a) Make it SPECIFIC to the user's actual idea. If they said "a bookstore cafe", mention cafes, books, shelves — not abstract categories. Generic questions are forbidden.\n\n` +
    `   (b) Phrase it in PLAIN LANGUAGE, like a smart friend asking, not a form.\n\n` +
    `   (c) Decide if MULTIPLE-CHOICE OPTIONS would actually help:\n` +
    `       - YES, give options when the dimension has a few obvious, distinct directions the user might not have considered (mood, style, lighting type, layout direction).\n` +
    `       - NO, leave options empty when the question is open-ended or personal (names, specific copy, exact numbers, "tell me more about X").\n\n` +
    `   (d) If giving options:\n` +
    `       - Provide 2 to 3 concrete, visual, meaningfully different options.\n` +
    `       - Add "Something else" as the FINAL option. Always last. Always.\n` +
    `       - Total options array length: 3–4 (2–3 real options + "Something else").\n` +
    `       - Options must be phrased in plain language a non-expert would understand.\n\n` +
    `   (e) If NOT giving options: use "options": [] (empty array). Do NOT add "Something else" — the user is already free to type anything.\n\n` +
    `═══════════════════════════════════════════════════════════════\n` +
    `## OUTPUT FORMAT — STRICT\n` +
    `═══════════════════════════════════════════════════════════════\n\n` +
    `Return ONLY a raw JSON array. No markdown. No code fences. No commentary before or after. No explanations.\n\n` +
    `Each object has this exact shape:\n` +
    `{\n` +
    `  "question": "Your specific, plain-language question?",\n` +
    `  "options": ["Option A", "Option B", "Something else"]\n` +
    `}\n\n` +
    `Do not output anything except the JSON array.`;

  const text = await callGemini(apiKey, prompt, {
    temperature: 0.7,
  });

  const cleaned = stripFences(text);
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("Raw Gemini response:", text);
    throw new Error("Failed to parse AI response. Please try again.");
  }
}

export async function generatePrompt(platformName, answers, extraNotes, category) {
  const apiKey = await getApiKey();
  if (!apiKey)
    throw new Error(
      "No API key saved. Please add your Gemini API key in Settings."
    );

  let prompt;

  if (category === "image") {
    prompt =
      `You are a senior prompt engineer for AI image generators (like Midjourney, DALL·E, Flux, Stable Diffusion). Take the user's brief and their answers, and write the single best image-generation prompt for them to paste in.\n\n` +
      `You are NOT generating the image. You are writing the PROMPT.\n\n` +
      `═══════════════════════════════════════════════════════════════\n` +
      `## INPUTS\n` +
      `═══════════════════════════════════════════════════════════════\n\n` +
      `USER'S ANSWERS:\n${answers}\n\n` +
      `EXTRA NOTES: ${extraNotes || "None"}\n\n` +
      `═══════════════════════════════════════════════════════════════\n` +
      `## WHAT A GREAT IMAGE PROMPT CONTAINS\n` +
      `═══════════════════════════════════════════════════════════════\n\n` +
      `Cover these layers, in this order, but include only what's relevant:\n\n` +
      `FOUNDATIONAL: subject (with specific physical detail), setting/environment.\n` +
      `STRUCTURAL: composition (framing/angle), lighting, style/medium.\n` +
      `REFINING: mood/atmosphere, colour palette, level of detail.\n\n` +
      `═══════════════════════════════════════════════════════════════\n` +
      `## YOUR INTERNAL WORKFLOW — FOLLOW THESE STEPS IN ORDER\n` +
      `═══════════════════════════════════════════════════════════════\n\n` +
      `### STEP 1 — ANCHOR THE SUBJECT\n` +
      `Start with the subject. Make it as specific and physical as possible. "A cosy bookstore café with floor-to-ceiling oak shelves, leather armchairs, and a marble counter" is strong. Pull every specific detail the user gave you into the subject description.\n\n` +
      `### STEP 2 — LAYER THE SCENE\n` +
      `Add setting, lighting, composition, and style — in that order. Each layer should add visual information, not just adjectives. Wrong: "beautiful lighting". Right: "warm afternoon light pouring through tall windows, casting long shadows across the wooden floor".\n\n` +
      `### STEP 3 — ADD MOOD AND PALETTE\n` +
      `Only if the user signalled these. A mood word ("melancholic", "serene", "electric") and a palette hint ("warm amber and deep brown tones") at the end can transform the result. Skip if not informed by the brief.\n\n` +
      `### STEP 4 — ASSEMBLE\n` +
      `Write as ONE flowing descriptive sentence or two, in this order:\n` +
      `   [subject with details], [setting], [composition + lighting], [style], [mood + palette]\n\n` +
      `Keep it under 70 words. Image models lose focus past that.\n\n` +
      `═══════════════════════════════════════════════════════════════\n` +
      `## HARD RULES\n` +
      `═══════════════════════════════════════════════════════════════\n\n` +
      `- No Midjourney-style parameters unless the user explicitly asked (no --ar, --v, ::, etc.).\n` +
      `- Every word must be visual and concrete. Cut filler ("amazing", "stunning", "beautiful").\n` +
      `- No meta-commentary, no preamble, no labels, no quotation marks, no code fences.\n` +
      `- Output ONLY the final prompt — one or two sentences, nothing else.`;

  } else if (category === "video") {
    prompt =
      `You are a senior prompt engineer for AI video generators (like Sora, Kling, Veo, Seedance). Take the user's brief and their answers, and write the single best video-generation prompt for them to paste in.\n\n` +
      `You are NOT generating the video. You are writing the PROMPT.\n\n` +
      `═══════════════════════════════════════════════════════════════\n` +
      `## INPUTS\n` +
      `═══════════════════════════════════════════════════════════════\n\n` +
      `USER'S ANSWERS:\n${answers}\n\n` +
      `EXTRA NOTES: ${extraNotes || "None"}\n\n` +
      `═══════════════════════════════════════════════════════════════\n` +
      `## WHAT A GREAT VIDEO PROMPT CONTAINS\n` +
      `═══════════════════════════════════════════════════════════════\n\n` +
      `Motion is paramount. Cover these layers in order:\n\n` +
      `FOUNDATIONAL: subject + action (what is happening), environment + time of day.\n` +
      `STRUCTURAL: camera motion, visual style, duration, aspect ratio.\n` +
      `REFINING: mood/tone, lighting nuance.\n\n` +
      `═══════════════════════════════════════════════════════════════\n` +
      `## YOUR INTERNAL WORKFLOW — FOLLOW THESE STEPS IN ORDER\n` +
      `═══════════════════════════════════════════════════════════════\n\n` +
      `### STEP 1 — ANCHOR THE ACTION\n` +
      `Start with subject and action — be precise about movement. Not "a man walking" but "a man in a long coat striding through an empty subway station, glancing over his shoulder".\n\n` +
      `### STEP 2 — PLACE THE CAMERA\n` +
      `Specify camera behaviour explicitly: static, slow push-in, orbit, tracking shot, handheld, drone pull-back, whip pan. If the user didn't specify, infer the camera move that best serves the mood and action (e.g. tense scene → slow push-in; epic reveal → drone pull-back).\n\n` +
      `### STEP 3 — SET THE WORLD\n` +
      `Add environment, time of day, and visual style. Use cinematic language the model understands ("golden hour", "neon-soaked", "overcast", "anamorphic", "documentary-style handheld").\n\n` +
      `### STEP 4 — ASSEMBLE\n` +
      `Write in this exact order, as one flowing description:\n` +
      `   [subject + action], [environment + time of day], [camera motion], [visual style], [mood + lighting], [duration + aspect ratio]\n\n` +
      `Example shape:\n` +
      `"A samurai slowly drawing his sword in a foggy bamboo forest at dawn, slow cinematic push-in, photorealistic style, tense and quiet atmosphere with soft golden rim light, 10 seconds, 16:9"\n\n` +
      `Keep it under 80 words.\n\n` +
      `═══════════════════════════════════════════════════════════════\n` +
      `## HARD RULES\n` +
      `═══════════════════════════════════════════════════════════════\n\n` +
      `- Always include duration and aspect ratio at the end (default to "5 seconds, 16:9" if the user didn't specify and the context doesn't suggest otherwise).\n` +
      `- No Midjourney-style parameters (no --ar, --v, ::).\n` +
      `- Every element must be visual and motion-aware.\n` +
      `- No meta-commentary, no preamble, no labels, no code fences.\n` +
      `- Output ONLY the final prompt text.`;

  } else if (category === "webdev") {
    prompt =
      `You are a senior prompt engineer for AI app builders (like Lovable, v0, Bolt, Cursor). Take the user's brief and their answers, and write the single best structured prompt for them to paste in.\n\n` +
      `You are NOT building the app. You are writing the PROMPT.\n\n` +
      `═══════════════════════════════════════════════════════════════\n` +
      `## INPUTS\n` +
      `═══════════════════════════════════════════════════════════════\n\n` +
      `USER'S ANSWERS:\n${answers}\n\n` +
      `EXTRA NOTES: ${extraNotes || "None"}\n\n` +
      `═══════════════════════════════════════════════════════════════\n` +
      `## WHAT A GREAT APP-BUILDER PROMPT CONTAINS\n` +
      `═══════════════════════════════════════════════════════════════\n\n` +
      `App builders need a structured brief, not flowing prose. Cover:\n\n` +
      `FOUNDATIONAL: core purpose, target user.\n` +
      `STRUCTURAL: pages/screens, key features, tech stack.\n` +
      `REFINING: visual style, tone of copy, interaction style.\n\n` +
      `═══════════════════════════════════════════════════════════════\n` +
      `## YOUR INTERNAL WORKFLOW — FOLLOW THESE STEPS IN ORDER\n` +
      `═══════════════════════════════════════════════════════════════\n\n` +
      `### STEP 1 — IDENTIFY THE CORE PURPOSE\n` +
      `Read what the user is building. If it's vague, infer the closest concrete thing.\n\n` +
      `### STEP 2 — INVENTORY THE SCOPE\n` +
      `List every page/screen and every feature the user mentioned or that logically follows from their app idea. Don't invent features they didn't imply, but DO include obvious essentials (e.g. an app with accounts implies login + signup screens).\n\n` +
      `### STEP 3 — INFER GAPS TASTEFULLY\n` +
      `If the user didn't specify tech stack, write "no preference — use defaults". If they didn't specify visual style, infer from the app type (fintech → clean and minimal; kids' app → playful and colourful). Never invent specifics the user didn't imply (no fake brand names, fake data, fake user counts).\n\n` +
      `### STEP 4 — ASSEMBLE WITH EXACT HEADERS\n` +
      `Output the prompt using these exact section headers, each on its own line, in this exact order:\n\n` +
      `App Overview: [one concrete sentence — what it does and who for]\n` +
      `Target User: [specific — not "everyone"]\n` +
      `Pages/Screens: [comma-separated list]\n` +
      `Key Features: [comma-separated list of functional requirements]\n` +
      `Tech Stack: [frameworks/libraries, or "no preference"]\n` +
      `Visual Style: [layout direction, colour feel, typography feel, density]\n` +
      `Tone of Copy: [register of any UI copy]\n\n` +
      `═══════════════════════════════════════════════════════════════\n` +
      `## HARD RULES\n` +
      `═══════════════════════════════════════════════════════════════\n\n` +
      `- Be technical and specific. This is a brief for a builder, not a marketing pitch.\n` +
      `- Banned filler words: "modern", "sleek", "user-friendly", "intuitive", "seamless", "robust" — unless paired with concrete specifics.\n` +
      `- No meta-commentary, no preamble, no code fences.\n` +
      `- Output ONLY the formatted prompt text — nothing else.`;

  } else {
    // Default: text category
    prompt =
      `You are a senior prompt engineer. Take the user's brief and their answers to follow-up questions, and assemble the single best possible prompt for them to paste into an AI text tool (like ChatGPT, Claude, or Gemini).\n\n` +
      `You are NOT executing the task yourself. You are writing the PROMPT that the user will paste into another AI to execute the task.\n\n` +
      `═══════════════════════════════════════════════════════════════\n` +
      `## INPUTS YOU HAVE\n` +
      `═══════════════════════════════════════════════════════════════\n\n` +
      `THE USER'S ANSWERS TO FOLLOW-UP QUESTIONS:\n${answers}\n\n` +
      `EXTRA NOTES FROM THE USER: ${extraNotes || "None"}\n\n` +
      `═══════════════════════════════════════════════════════════════\n` +
      `## WHAT A GREAT TEXT PROMPT CONTAINS\n` +
      `═══════════════════════════════════════════════════════════════\n\n` +
      `FOUNDATIONAL:\n` +
      `- Task: a clear verb-led instruction.\n` +
      `- Context: background the AI needs to do the job well.\n` +
      `- Audience: who the output is for and what they already know.\n\n` +
      `STRUCTURAL:\n` +
      `- Output Format: the exact shape of the response (paragraphs, bullets, table, email, outline, JSON, dialogue, etc.).\n` +
      `- Constraints: length, what to avoid, banned words, must-include points, reading level.\n` +
      `- Tone / Voice: the register of the writing.\n\n` +
      `REFINING:\n` +
      `- Role: a persona for the AI to adopt, when it would meaningfully sharpen the output.\n` +
      `- Examples: a short sample of what "good" looks like.\n` +
      `- Success criteria: how the user will judge if the output is right.\n\n` +
      `═══════════════════════════════════════════════════════════════\n` +
      `## YOUR INTERNAL WORKFLOW — FOLLOW THESE STEPS IN ORDER\n` +
      `═══════════════════════════════════════════════════════════════\n\n` +
      `### STEP 1 — IDENTIFY THE TASK\n` +
      `Read the brief, the answers, the extra notes. In your head, state in one sentence: "The user wants the AI to ___." This is the Task. Everything else exists to serve it.\n\n` +
      `### STEP 2 — GATHER WHAT YOU KNOW\n` +
      `For each layer above, note what the user has explicitly told you. Anything they didn't tell you, you can either (a) leave out, or (b) infer tastefully if the inference is obvious and low-risk. Never fabricate specifics the user didn't imply (no fake company names, fake stats, fake audiences).\n\n` +
      `### STEP 3 — CHOOSE A ROLE (ONLY IF IT HELPS)\n` +
      `A Role is powerful but easy to overuse. Include one ONLY when the task genuinely benefits from a specific perspective (e.g. "Act as a senior copy editor" for editing work, "Act as a UX researcher" for user interview synthesis). For casual or generic tasks, skip the role entirely — it adds noise.\n\n` +
      `### STEP 4 — ASSEMBLE THE PROMPT\n` +
      `Write the prompt in this order, including only the sections that apply:\n\n` +
      `   1. Role (if used) — one sentence.\n` +
      `   2. Context — what the AI needs to know about the situation.\n` +
      `   3. Task — the core instruction, verb-led, unambiguous.\n` +
      `   4. Audience — who this is for.\n` +
      `   5. Constraints — bullet list of must-dos and must-not-dos.\n` +
      `   6. Output Format — exactly how the response should be structured.\n` +
      `   7. Examples — if the user gave one or one is clearly helpful.\n` +
      `   8. Success criteria — only if non-obvious from the task.\n\n` +
      `Use clear headers (e.g. "## Context", "## Task") ONLY if the prompt is long enough to need them (roughly 150+ words). For shorter prompts, write flowing prose paragraphs — headers on a 50-word prompt look amateurish.\n\n` +
      `### STEP 5 — POLISH PASS\n` +
      `Before finalising, check:\n` +
      `   - Every sentence earns its place. Cut anything that doesn't change the output.\n` +
      `   - No filler adjectives ("comprehensive", "detailed", "high-quality") unless paired with concrete specifics.\n` +
      `   - No vague directions ("write well", "make it good"). Replace with concrete criteria.\n` +
      `   - The prompt sounds like it was written by a professional, not a beginner.\n` +
      `   - It is specific to the user's actual brief — not a generic template.\n\n` +
      `═══════════════════════════════════════════════════════════════\n` +
      `## HARD RULES\n` +
      `═══════════════════════════════════════════════════════════════\n\n` +
      `- Write the prompt in second person addressed to the AI ("Write a...", "Your task is to...", "You are a..."). Not third person, not first.\n` +
      `- Do NOT include meta-commentary about the prompt itself.\n` +
      `- Do NOT include preamble like "Here is your prompt:" or sign-offs.\n` +
      `- Do NOT wrap the output in quotation marks or code fences.\n` +
      `- Output ONLY the final prompt — nothing else.`;
  }

  const text = await callGemini(apiKey, prompt, { temperature: 0.7 });
  return stripFences(text);
}
