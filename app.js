const statusEl = document.getElementById("status");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b91c1c" : "#166534";
}

async function initSupabase() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    setStatus("Fill in supabase-config.js with your project URL and anon key.", true);
    return;
  }

  try {
    const { createClient } = window.supabase;
    const client = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const { error } = await client.auth.getSession();

    if (error) {
      throw error;
    }

    setStatus("Supabase connected.");
  } catch (error) {
    setStatus(`Supabase error: ${error.message}`, true);
  }
}

initSupabase();
