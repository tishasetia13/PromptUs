# PromptUs

A Chrome extension that turns a rough idea into a detailed, well-structured prompt for AI tools.

You describe what you want in a sentence. PromptUs asks you a few multiple-choice questions written for your specific idea, then writes the final prompt and places it straight into the text box of the AI site you are on.

**Status:** working as an unpacked Chrome extension. Not published on the Chrome Web Store.

## How it works

1. **Sign in with Google.** The extension uses Chrome's identity API. On first sign-in, a user record is created in Supabase to track how many prompts you have generated.
2. **Describe your goal.** If you have already typed something into the AI site's text box, PromptUs reads it and prefills it. Otherwise you type it in the popup.
3. **Pick a category:** Text, Image, Video or Webdev. This tells the model what kind of tool the prompt is for, since a prompt for an image generator needs different details than a prompt for an app builder.
4. **Answer follow-up questions.** The backend asks Gemini to write questions specific to your idea. Each question has suggested options plus a free-text answer. The number of questions depends on how much detail your idea already has, and can be zero.
5. **Add extra notes** and review a summary of everything you answered.
6. **Generate.** Gemini writes the final prompt, treating your original idea as the main source of truth and your answers as refinements. The prompt appears in the popup with a Copy button and is also inserted into the text box on the page.

## Architecture

| Part | What it does |
|------|--------------|
| Popup (`popup.html`, `popup.js`, `popup.css`, `mcq.js`) | The screens and the question flow |
| Content script (`content.js`) | Runs on the web page. Reads the text in the page's active text box, and writes the generated prompt back into it |
| Backend (`promptus-backend`, Express on Vercel) | One endpoint, `POST /api/generate`, with `type` set to `questions` or `prompt`. Calls Gemini, so the API key never reaches the user's browser |
| Database (Supabase) | A `users` table storing Google ID, email, name, usage count and plan |
| Auth (`auth.js`) | Google sign-in through `chrome.identity` |

### Inserting text into AI chat sites

Many AI chat sites are built with React, which does not notice when a script simply sets a text box's value. The content script sets the value through the browser's native input setter and then fires `input` and `change` events, so React registers the change. For rich-text editors (`contenteditable` elements), it uses the browser's own `insertText` editing command instead.

## Tech stack

| Layer | Choice |
|-------|--------|
| Extension | Chrome Extension, Manifest V3, plain JavaScript, HTML, CSS |
| LLM | Gemini API (called from the backend) |
| Backend | Node.js, Express, deployed on Vercel |
| Database | Supabase (Postgres, accessed through its REST API) |
| Auth | Google OAuth through `chrome.identity` |

## Run it locally

1. Clone this repo.
2. Open Chrome and go to `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.
5. Pin PromptUs from the puzzle-piece menu in the toolbar.

Note: Google sign-in only works with an OAuth client ID registered for the extension's ID. To run your own copy, you need your own Google OAuth client, Supabase project and backend deployment, and you need to replace the values in `manifest.json`, `db.js` and `gemini.js`.

## Limitations

- **The free-tier limit is checked in the extension, not on the backend.** Someone could bypass the 10-prompt limit by calling the backend directly or editing local storage. A real release would check usage on the server.
- **Usage tracking fails open.** If the database call fails, generation is still allowed.
- **Text insertion uses `document.execCommand`,** which browsers have deprecated. It could stop working if browsers remove it or sites change their editors.
- **The content script runs on every page** (`<all_urls>`) so it can work on any AI site. A store release would narrow this to specific sites.
- **The Upgrade and History buttons are placeholders.** There are no payments, and history is not built yet.
- **Not published** on the Chrome Web Store.
