// TODO: Replace YOUR_VERCEL_URL with your actual deployed Vercel URL before testing

const BACKEND_URL = "https://promptus-backend.vercel.app";

export async function generateQuestions(platformName, userIntent, category) {
  const res = await fetch(`${BACKEND_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "questions", platformName, userIntent, category }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

export async function generatePrompt(platformName, userIntent, answers, extraNotes, category) {
  const res = await fetch(`${BACKEND_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "prompt", platformName, userIntent, category, answers, extraNotes }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}
