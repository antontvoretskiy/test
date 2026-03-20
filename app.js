const statusEl = document.getElementById("status");
const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("email");
const sessionEl = document.getElementById("session");
const sessionTextEl = document.getElementById("session-text");
const signOutButton = document.getElementById("sign-out");
const signInGoogleButton = document.getElementById("sign-in-google");
const signInGithubButton = document.getElementById("sign-in-github");

let supabaseClient;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b91c1c" : "#166534";
}

function renderSession(session) {
  const userEmail = session?.user?.email;
  const isSignedIn = Boolean(userEmail);

  authForm.hidden = isSignedIn;
  sessionEl.hidden = !isSignedIn;

  if (isSignedIn) {
    sessionTextEl.textContent = `Signed in as ${userEmail}`;
    setStatus("Supabase connected and authorized.");
    return;
  }

  sessionTextEl.textContent = "";
  setStatus("Supabase connected. Sign in with your email.");
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  try {
    setStatus("Sending magic link...");
    const email = emailInput.value.trim();
    const redirectUrl = window.SUPABASE_REDIRECT_URL || (window.location.origin + window.location.pathname);
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      throw error;
    }

    setStatus("Check your email for the sign-in link.");
  } catch (error) {
    setStatus(`Auth error: ${error.message}`, true);
  }
}

async function handleOAuthSignIn(provider) {
  try {
    setStatus(`Redirecting to ${provider}...`);
    const redirectUrl = window.SUPABASE_REDIRECT_URL || (window.location.origin + window.location.pathname);
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    setStatus(`OAuth error: ${error.message}`, true);
  }
}

async function handleSignOut() {
  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }

    renderSession(null);
  } catch (error) {
    setStatus(`Sign-out error: ${error.message}`, true);
  }
}

async function initSupabase() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    setStatus("Fill in supabase-config.js with your project URL and anon key.", true);
    return;
  }

  try {
    const { createClient } = window.supabase;
    supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    authForm.addEventListener("submit", handleAuthSubmit);
    signOutButton.addEventListener("click", handleSignOut);
    signInGoogleButton.addEventListener("click", () => handleOAuthSignIn("google"));
    signInGithubButton.addEventListener("click", () => handleOAuthSignIn("github"));
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      renderSession(session);
    });

    renderSession(data.session);
  } catch (error) {
    setStatus(`Supabase error: ${error.message}`, true);
  }
}

initSupabase();
