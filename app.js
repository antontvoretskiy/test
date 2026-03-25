const statusEl = document.getElementById("status");
const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("email");
const sessionEl = document.getElementById("session");
const sessionTextEl = document.getElementById("session-text");
const signOutButton = document.getElementById("sign-out");
const signInGoogleButton = document.getElementById("sign-in-google");
const signInGithubButton = document.getElementById("sign-in-github");
const researchForm = document.getElementById("research-form");
const loadDemoButton = document.getElementById("load-demo");
const resultsRoot = document.getElementById("results-root");
const saveRunButton = document.getElementById("save-run");
const saveStatusEl = document.getElementById("save-status");

let supabaseClient;
let currentSession = null;
let latestResearchRun = null;

const segmentArchetypes = [
  {
    name: "Stuck Starter",
    situation: "Has ambition but no stable system.",
    jobs: ["start publishing", "gain first traction", "turn effort into visible progress"],
    painSeed: "I know I should be moving, but I still freeze when it is time to act.",
    trigger: "Another week passes with no consistent output.",
    failedAttempt: "Saved templates and courses but never built a repeatable process.",
    fear: "A year from now I will still be watching others grow while I stay invisible.",
    buyingSignal: "Wants clarity and momentum fast.",
    contentAngle: "Show simple systems that remove paralysis.",
  },
  {
    name: "Overloaded Operator",
    situation: "Already working hard but drowning in execution.",
    jobs: ["save time", "reduce chaos", "maintain output without burnout"],
    painSeed: "Everything depends on me, and content keeps becoming the task that slips first.",
    trigger: "Client work or operations eat the whole week.",
    failedAttempt: "Hired random freelancers but spent more time fixing them than delegating.",
    fear: "Growth will stall because the system cannot scale around my time.",
    buyingSignal: "Pays for leverage if it reduces overload.",
    contentAngle: "Position the offer as operational relief, not inspiration.",
  },
  {
    name: "Expert Without Packaging",
    situation: "Knows the craft but struggles to translate expertise into audience language.",
    jobs: ["package expertise", "sound clear", "turn knowledge into demand"],
    painSeed: "I know what I do is valuable, but I cannot explain it in a way people instantly get.",
    trigger: "Potential buyers ask what makes the offer different.",
    failedAttempt: "Posted educational content that sounded smart but did not convert.",
    fear: "The market will keep rewarding louder people with weaker expertise.",
    buyingSignal: "Values stronger positioning and messaging.",
    contentAngle: "Use messaging that reframes expertise as an unfair advantage.",
  },
  {
    name: "Skeptical Buyer",
    situation: "Has already spent money and now distrusts promises.",
    jobs: ["avoid another bad decision", "find evidence", "de-risk purchase"],
    painSeed: "I am tired of polished offers that collapse the moment you get inside.",
    trigger: "Another course or agency promise sounds familiar.",
    failedAttempt: "Bought into attractive positioning with weak implementation.",
    fear: "I will waste more money and lose time I cannot recover.",
    buyingSignal: "Needs proof, specifics, and grounded expectations.",
    contentAngle: "Lead with evidence, mechanics, and boundaries.",
  },
  {
    name: "Urgent Transformer",
    situation: "Facing a near-term need to change results fast.",
    jobs: ["fix pipeline", "recover revenue", "regain confidence"],
    painSeed: "This is not just annoying anymore, it is starting to affect revenue and confidence.",
    trigger: "Leads slow down, launches underperform, or visibility drops.",
    failedAttempt: "Tried pushing harder without changing the underlying message or system.",
    fear: "If nothing changes soon, the business will enter a much harder recovery phase.",
    buyingSignal: "High urgency and willingness to move now.",
    contentAngle: "Sell speed to insight and clearer action.",
  },
  {
    name: "Aspirational Builder",
    situation: "Wants strategic growth and identity expansion.",
    jobs: ["grow category authority", "build brand gravity", "move upmarket"],
    painSeed: "I do not just want more output, I want a sharper identity that pulls the right people in.",
    trigger: "Current messaging attracts weak-fit leads or generic attention.",
    failedAttempt: "Copied positioning patterns from other creators in the niche.",
    fear: "The brand will stay generic and impossible to premium-price.",
    buyingSignal: "Buys strategic positioning, not tactical hacks.",
    contentAngle: "Focus on identity, distinction, and category language.",
  },
];

const intensityLabels = {
  1: "Neutral",
  2: "Frustration",
  3: "Pain",
  4: "Panic",
};

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function setSaveStatus(message, isError = false) {
  saveStatusEl.textContent = message;
  saveStatusEl.style.color = isError ? "#b42318" : "#6b5f54";
}

function syncSaveButtonState() {
  saveRunButton.disabled = !currentSession || !latestResearchRun;
}

function renderSession(session) {
  currentSession = session || null;
  const userEmail = session?.user?.email;
  const isSignedIn = Boolean(userEmail);

  authForm.hidden = isSignedIn;
  sessionEl.hidden = !isSignedIn;

  if (isSignedIn) {
    sessionTextEl.textContent = `Signed in as ${userEmail}`;
    setStatus("Supabase connected and authorized.");
    setSaveStatus(latestResearchRun ? "Ready to save the latest run to Supabase." : "Generate a run first, then save it.");
    syncSaveButtonState();
    return;
  }

  sessionTextEl.textContent = "";
  setStatus("Supabase connected. Sign in or keep using the local MVP.");
  setSaveStatus(latestResearchRun ? "Sign in to save the latest run." : "No saved runs yet.");
  syncSaveButtonState();
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  try {
    setStatus("Sending magic link...");
    const email = emailInput.value.trim();
    const redirectUrl = window.SUPABASE_REDIRECT_URL || `${window.location.origin}${window.location.pathname}`;
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
    const redirectUrl = window.SUPABASE_REDIRECT_URL || `${window.location.origin}${window.location.pathname}`;
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

function scoreRepeatability(count) {
  if (count >= 5) {
    return "Core";
  }

  if (count >= 3) {
    return "Medium";
  }

  return "Weak";
}

function sanitizeInput(value) {
  return value.trim().replace(/\s+/g, " ");
}

function getFormData() {
  return {
    productName: sanitizeInput(document.getElementById("product-name").value),
    productPromise: sanitizeInput(document.getElementById("product-promise").value),
    audienceDescription: sanitizeInput(document.getElementById("audience-description").value),
    market: sanitizeInput(document.getElementById("market").value),
    channel: sanitizeInput(document.getElementById("channel").value),
    brandDna: sanitizeInput(document.getElementById("brand-dna").value),
    scenario: sanitizeInput(document.getElementById("scenario").value),
    segmentCount: Number(document.getElementById("segment-count").value),
    personaCount: Number(document.getElementById("persona-count").value),
  };
}

function buildInterviewArchetype(segment, personaIndex, formData) {
  const pains = [
    `The hardest part is ${segment.painSeed.toLowerCase()}`,
    `I keep feeling that ${formData.productPromise.toLowerCase().slice(0, 96)}.`,
    `What blocks me is that ${segment.failedAttempt.toLowerCase()}`,
  ];

  const quotes = [
    `I keep telling myself: "${segment.painSeed}"`,
    `"${segment.trigger}" is usually the moment I realize this is still broken."`,
    `"${segment.fear}" is what makes this feel urgent."`,
    `"I need ${formData.productName} to help me stop guessing and start moving with a real system."`,
  ];

  return {
    personaName: `${segment.name} Persona ${personaIndex + 1}`,
    role: `${formData.market || "Core market"} operator`,
    summary: `${segment.situation} Works mainly through ${formData.channel || "mixed channels"} and is trying to improve outcomes without adding chaos.`,
    answers: [
      {
        question: "What is most frustrating in your current situation?",
        answer: pains[personaIndex % pains.length],
      },
      {
        question: "Tell me about the last moment it felt like a real problem.",
        answer: `${segment.trigger} In that moment, I felt like I was working hard without a clear system or proof that the effort would compound.`,
      },
      {
        question: "What have you already tried?",
        answer: segment.failedAttempt,
      },
      {
        question: "If nothing changes, what happens next?",
        answer: segment.fear,
      },
    ],
    quotes,
  };
}

function generateResearch(formData) {
  const segments = Array.from({ length: formData.segmentCount }, (_, index) => {
    const archetype = segmentArchetypes[index % segmentArchetypes.length];
    const painWeight = 2 + (index % 3);
    const urgency = 2 + ((index + 1) % 3);
    const emotionalIntensity = Math.min(4, 2 + (index % 3));
    const repeatabilityCount = 2 + (index % 5);
    const personas = Array.from({ length: formData.personaCount }, (_, personaIndex) =>
      buildInterviewArchetype(archetype, personaIndex, formData)
    );

    return {
      id: `segment-${index + 1}`,
      name: `${archetype.name} ${index + 1}`,
      marketFit: `${formData.audienceDescription}. ${archetype.situation}`,
      jobs: archetype.jobs,
      topPain: archetype.painSeed,
      trigger: archetype.trigger,
      failedAttempt: archetype.failedAttempt,
      fear: archetype.fear,
      buyingSignal: archetype.buyingSignal,
      contentAngle: archetype.contentAngle,
      emotionalIntensity,
      urgency,
      commercialRelevance: painWeight + 1,
      repeatabilityCount,
      repeatability: scoreRepeatability(repeatabilityCount),
      personas,
    };
  });

  const topSegments = [...segments]
    .sort((left, right) => (right.commercialRelevance + right.urgency) - (left.commercialRelevance + left.urgency))
    .slice(0, 3);

  const verbatims = segments.flatMap((segment) => ([
    {
      text: segment.topPain,
      segment: segment.name,
      repeatabilityCount: segment.repeatabilityCount,
      emotionalIntensity: segment.emotionalIntensity,
    },
    {
      text: segment.trigger,
      segment: segment.name,
      repeatabilityCount: Math.max(2, segment.repeatabilityCount - 1),
      emotionalIntensity: Math.min(4, segment.emotionalIntensity + 1),
    },
  ])).sort((left, right) => right.repeatabilityCount - left.repeatabilityCount).slice(0, 10);

  const hooks = topSegments.map((segment) =>
    `For ${segment.name.toLowerCase()}: speak to "${segment.topPain}" and promise a more concrete path to ${formData.productPromise.toLowerCase()}.`
  );

  const leadMagnets = topSegments.map((segment) =>
    `${segment.name}: quick diagnostic checklist for "${segment.trigger.toLowerCase()}"`
  );

  return {
    meta: {
      projectName: formData.productName,
      generatedAt: new Date().toLocaleString(),
      simulationMode: "Synthetic Only",
    },
    summary: {
      segmentCount: segments.length,
      personaCount: segments.length * formData.personaCount,
      interviewCount: segments.length * formData.personaCount,
      topSegment: topSegments[0]?.name || "N/A",
    },
    segments,
    topSegments,
    verbatims,
    patterns: [
      "Urgency rises when effort is already high but output still feels random.",
      "Buyers distrust broad promises and respond better to mechanics, proof, and specificity.",
      "Strong demand signals cluster around clarity, repeatability, and faster decision-making.",
      "Content hooks perform better when they mirror frustration and failed attempts, not abstract aspirations.",
    ],
    hooks,
    leadMagnets,
    contentThemes: [
      "Why smart operators still stay inconsistent without a system",
      "What people already tried before they finally buy help",
      "How to turn expert knowledge into language the market instantly understands",
      "What urgency really sounds like right before a buyer moves",
    ],
  };
}

function renderSummary(summary, meta) {
  return `
    <section>
      <p class="eyebrow">Run Summary</p>
      <div class="summary-grid">
        <article class="summary-tile">
          <strong>${summary.segmentCount}</strong>
          <span>Segments generated for ${meta.projectName}</span>
        </article>
        <article class="summary-tile">
          <strong>${summary.personaCount}</strong>
          <span>Synthetic personas across all segments</span>
        </article>
        <article class="summary-tile">
          <strong>${summary.interviewCount}</strong>
          <span>Interview simulations completed</span>
        </article>
        <article class="summary-tile">
          <strong>${summary.topSegment}</strong>
          <span>Highest-priority segment right now</span>
        </article>
      </div>
      <p class="section-copy">Mode: ${meta.simulationMode}. Generated ${meta.generatedAt}.</p>
    </section>
  `;
}

function renderTopSegments(topSegments) {
  return `
    <section class="result-card">
      <h3>Priority Segments</h3>
      ${topSegments.map((segment) => `
        <article class="segment-card">
          <div class="segment-header">
            <h4>${segment.name}</h4>
            <span>${segment.marketFit}</span>
          </div>
          <div class="segment-metrics">
            <div class="metric">${segment.repeatability}<span>Repeatability</span></div>
            <div class="metric">${intensityLabels[segment.emotionalIntensity]}<span>Emotion</span></div>
            <div class="metric">${segment.urgency}/4<span>Urgency</span></div>
            <div class="metric">${segment.commercialRelevance}/4<span>Commercial</span></div>
          </div>
          <p><strong>Pain:</strong> ${segment.topPain}</p>
          <p><strong>Trigger:</strong> ${segment.trigger}</p>
          <p><strong>Failed attempt:</strong> ${segment.failedAttempt}</p>
          <p><strong>Buying signal:</strong> ${segment.buyingSignal}</p>
        </article>
      `).join("")}
    </section>
  `;
}

function renderVerbatims(verbatims) {
  return `
    <section class="result-card">
      <h3>Top Phrases</h3>
      <div class="quotes">
        ${verbatims.map((quote) => `
          <blockquote>
            ${quote.text}
            <footer>${quote.segment} · ${scoreRepeatability(quote.repeatabilityCount)} repeatability · ${intensityLabels[quote.emotionalIntensity]}</footer>
          </blockquote>
        `).join("")}
      </div>
    </section>
  `;
}

function renderPatterns(research) {
  return `
    <section class="result-card">
      <h3>Patterns and Angles</h3>
      <div class="chip-list">
        ${research.patterns.map((pattern) => `<div class="chip"><strong>Pattern</strong>${pattern}</div>`).join("")}
        ${research.hooks.map((hook) => `<div class="chip"><strong>Hook</strong>${hook}</div>`).join("")}
        ${research.leadMagnets.map((magnet) => `<div class="chip"><strong>Lead Magnet</strong>${magnet}</div>`).join("")}
      </div>
    </section>
  `;
}

function renderThemes(themes) {
  return `
    <section class="result-card">
      <h3>Content Themes</h3>
      <div class="chip-list">
        ${themes.map((theme) => `<div class="chip"><strong>Theme</strong>${theme}</div>`).join("")}
      </div>
    </section>
  `;
}

function renderInterviews(segments) {
  const interviewCards = segments.slice(0, 3).flatMap((segment) =>
    segment.personas.slice(0, 1).map((persona) => `
      <article class="interview-card">
        <strong>${persona.personaName}</strong>
        <p class="muted">${persona.summary}</p>
        ${persona.answers.map((entry) => `<p><strong>${entry.question}</strong><br>${entry.answer}</p>`).join("")}
        <footer>${segment.name}</footer>
      </article>
    `)
  ).join("");

  return `
    <section class="result-card">
      <h3>Synthetic Interviews</h3>
      <div class="interview-list">
        ${interviewCards}
      </div>
    </section>
  `;
}

function renderResearch(research) {
  latestResearchRun = research;
  syncSaveButtonState();
  setSaveStatus(currentSession ? "Latest run is ready to save." : "Sign in to save this run to Supabase.");
  resultsRoot.innerHTML = `
    ${renderSummary(research.summary, research.meta)}
    <div class="results-grid">
      ${renderTopSegments(research.topSegments)}
      ${renderVerbatims(research.verbatims)}
      ${renderPatterns(research)}
      ${renderThemes(research.contentThemes)}
    </div>
    ${renderInterviews(research.segments)}
  `;
}

function fillDemoData() {
  document.getElementById("product-name").value = "Synthetic Custdev Studio";
  document.getElementById("product-promise").value = "Helps experts and founders model their audience, discover monetizable pain, and generate sharper hooks before launch.";
  document.getElementById("audience-description").value = "Creators, coaches, consultants, and small founders who need clearer positioning and faster market feedback.";
  document.getElementById("market").value = "RU + CIS digital experts";
  document.getElementById("channel").value = "Telegram, Instagram, YouTube";
  document.getElementById("brand-dna").value = "Direct strategist, sharp language, no fluff, values evidence and clear systems over hype.";
  document.getElementById("scenario").value = "Test a premium synthetic custdev offer for audience research, positioning, hooks, and content planning.";
  document.getElementById("segment-count").value = "8";
  document.getElementById("persona-count").value = "5";
}

function handleResearchSubmit(event) {
  event.preventDefault();

  const formData = getFormData();
  const research = generateResearch(formData);
  research.input = formData;
  renderResearch(research);
}

async function saveLatestRun() {
  if (!supabaseClient) {
    setSaveStatus("Supabase client is not ready.", true);
    return;
  }

  if (!currentSession) {
    setSaveStatus("Sign in before saving to Supabase.", true);
    return;
  }

  if (!latestResearchRun) {
    setSaveStatus("Generate a research run first.", true);
    return;
  }

  try {
    setSaveStatus("Saving run to Supabase...");
    const payload = {
      user_id: currentSession.user.id,
      project_name: latestResearchRun.meta.projectName,
      simulation_mode: latestResearchRun.meta.simulationMode,
      input_payload: latestResearchRun.input,
      output_payload: latestResearchRun,
    };

    const { error } = await supabaseClient.from("research_runs").insert(payload);

    if (error) {
      throw error;
    }

    setSaveStatus(`Run saved to Supabase at ${new Date().toLocaleTimeString()}.`);
  } catch (error) {
    if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
      setSaveStatus("Create the table first with supabase-schema.sql, then save again.", true);
      return;
    }

    setSaveStatus(`Save failed: ${error.message}`, true);
  }
}

async function initSupabase() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    setStatus("Add supabase-config.js to enable auth. The local MVP still works without it.", true);
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

loadDemoButton.addEventListener("click", fillDemoData);
researchForm.addEventListener("submit", handleResearchSubmit);
saveRunButton.addEventListener("click", saveLatestRun);
fillDemoData();
initSupabase();
