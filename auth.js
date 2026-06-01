// auth.js
// Handles Google Sign-In via Chrome's identity API.
// Exports two functions used by popup.js: signInWithGoogle() and getCurrentUser()

/**
 * Triggers Google OAuth flow, fetches the user's profile,
 * saves it to chrome.storage.local, and returns the user object.
 */
export async function signInWithGoogle() {
  return new Promise((resolve, reject) => {
    // Ask Chrome for a Google OAuth token interactively (shows consent screen if needed)
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      try {
        // Use the token to fetch the user's Google profile
        const response = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch Google profile");
        }

        const profile = await response.json();

        // Build a clean user object with only what we need
        const user = {
          google_id: profile.id,
          email:     profile.email,
          name:      profile.name,
        };

        // Persist to local storage so getCurrentUser() can find it next time
        await chrome.storage.local.set({ promptus_user: user });

        resolve(user);
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Checks chrome.storage.local for a saved user.
 * Returns the user object if found, or null if not signed in.
 */
export async function getCurrentUser() {
  return new Promise((resolve) => {
    chrome.storage.local.get("promptus_user", (result) => {
      resolve(result.promptus_user || null);
    });
  });
}
