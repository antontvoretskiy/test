const statusEl = document.getElementById("status");
const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("email");
const sessionEl = document.getElementById("session");
const sessionTextEl = document.getElementById("session-text");
const signOutButton = document.getElementById("sign-out");
const signInGoogleButton = document.getElementById("sign-in-google");
const signInGithubButton = document.getElementById("sign-in-github");
const saveRunButton = document.getElementById("save-run");
const saveStatusEl = document.getElementById("save-status");
const historyListEl = document.getElementById("history-list");

const chatEl = document.getElementById("chat");
const chatInputEl = document.getElementById("chat-input");
const fileInputEl = document.getElementById("file-input");
const attachTriggerButton = document.getElementById("attach-trigger");
const sendMessageButton = document.getElementById("send-message");
const runResearchButton = document.getElementById("run-research");
const attachmentsEl = document.getElementById("attachments");
const attachmentBarEl = document.getElementById("attachment-bar");
const pipelineEl = document.getElementById("pipeline");

const resultsEl = document.getElementById("results");
const metricsEl = document.getElementById("metrics");
const segmentsEl = document.getElementById("segments");
const quotesEl = document.getElementById("quotes");
const themesEl = document.getElementById("themes");
const downloadReportButton = document.getElementById("download-report");
const downloadDossierButton = document.getElementById("download-dossier");

let supabaseClient;
let currentSession = null;
let latestResearchRun = null;
let savedRuns = [];
let chatMessages = [];
let uploadedDocuments = [];
let currentStatuses = [];

const archetypes = [
  {
    name: "Нестабильный старт",
    situation: "Есть желание расти, но нет устойчивой системы действий.",
    pain: "Я вроде понимаю, что надо делать, но в моменте все стопорится.",
    trigger: "Проходит еще одна неделя без понятного результата.",
    attempt: "Пробовал шаблоны, советы и разрозненные курсы, но в систему это не сложилось.",
    fear: "Через год окажусь в той же точке, а рынок уйдет вперед без меня.",
    angle: "Обещать не вдохновение, а структурный сдвиг и ясность.",
  },
  {
    name: "Перегруженный исполнитель",
    situation: "Работает много, но упирается в хаос и ручное управление.",
    pain: "Все держится на мне, и именно это уже мешает расти.",
    trigger: "Операционка съедает все окно для развития и контента.",
    attempt: "Пытался делегировать, но тратил больше времени на исправления, чем выигрывал.",
    fear: "Рост остановится, потому что система не выдерживает нагрузку.",
    angle: "Показывать выгоду через снятие перегруза и скорость принятия решений.",
  },
  {
    name: "Сильный эксперт без упаковки",
    situation: "Экспертиза есть, но рынок не понимает ценность мгновенно.",
    pain: "Я умею делать сильный результат, но не могу объяснить это так, чтобы захотели купить.",
    trigger: "Люди читают, соглашаются, но не двигаются к покупке.",
    attempt: "Делал умный контент, но он не превращался в спрос.",
    fear: "Более громкие, но более слабые игроки будут забирать внимание и деньги.",
    angle: "Упор на язык, позиционирование и правильную формулировку ценности.",
  },
  {
    name: "Осторожный покупатель",
    situation: "Уже тратил деньги и теперь не верит в красивые обещания.",
    pain: "Я устал от упаковки, которая выглядит сильно только до оплаты.",
    trigger: "Снова слышит знакомые обещания без внятной механики.",
    attempt: "Покупал решения с хорошим маркетингом и слабой глубиной.",
    fear: "Потеряет еще деньги и время, которые уже сложно компенсировать.",
    angle: "Продавать через доказательность, рамки и конкретику.",
  },
  {
    name: "Срочный трансформатор",
    situation: "Нужно менять ситуацию быстро, потому что это уже бьет по выручке и уверенности.",
    pain: "Это уже не просто дискомфорт, это реально мешает бизнесу.",
    trigger: "Снижаются лиды, проседают запуски или падает отклик.",
    attempt: "Пробовал давить сильнее, не меняя основу оффера и коммуникации.",
    fear: "Если не сдвинуться сейчас, потом восстановление будет намного дороже.",
    angle: "Коммуницировать скорость получения ясности и направления.",
  },
  {
    name: "Амбициозный строитель категории",
    situation: "Хочет не просто поток, а более сильную рыночную идентичность.",
    pain: "Не хочу быть еще одним похожим игроком без своей формы и силы притяжения.",
    trigger: "Текущая упаковка притягивает слабые или случайные лиды.",
    attempt: "Копировал рыночные паттерны и получал такую же серую выдачу.",
    fear: "Бренд останется безлицаем и не сможет продаваться дороже.",
    angle: "Говорить про категорию, позицию и рыночную дистанцию от конкурентов.",
  },
];

const stopwords = new Set([
  "и", "в", "на", "с", "что", "это", "как", "для", "или", "но", "не", "по", "из", "мы", "вы",
  "а", "у", "к", "до", "от", "за", "под", "про", "при", "без", "над", "если", "уже", "еще",
  "когда", "где", "кто", "чтобы", "только", "очень", "тоже", "есть", "будет", "нужно", "надо",
  "просто", "после", "потому", "этого", "этот", "эта", "эти", "those", "with", "from", "your",
]);

function setStatus(message, isError = false) {
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function setSaveStatus(message, isError = false) {
  if (!saveStatusEl) {
    return;
  }

  saveStatusEl.textContent = message;
  saveStatusEl.style.color = isError ? "#b42318" : "#6f6559";
}

function syncSaveButtonState() {
  saveRunButton.disabled = !currentSession || !latestResearchRun;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function addMessage(role, text, docs = []) {
  chatMessages.push({
    id: crypto.randomUUID(),
    role,
    text,
    docs,
    createdAt: new Date().toISOString(),
  });
  renderChat();
}

function renderAttachmentBar() {
  if (!attachmentBarEl) {
    return;
  }

  if (!uploadedDocuments.length) {
    attachmentBarEl.classList.remove("active");
    attachmentBarEl.innerHTML = "";
    return;
  }

  attachmentBarEl.classList.add("active");
  attachmentBarEl.innerHTML = uploadedDocuments.map((doc) => `
    <div class="attachment-chip">
      <span>${escapeHtml(doc.name)}</span>
      <button type="button" data-doc-id="${doc.id}" aria-label="Удалить документ">×</button>
    </div>
  `).join("");
}

function renderChat() {
  chatEl.innerHTML = chatMessages.map((message) => `
    <article class="message ${message.role}">
      ${escapeHtml(message.text)}
      ${message.docs.length ? `
        <div class="docs">
          ${message.docs.map((doc) => `<div class="doc-chip">${escapeHtml(doc.name)}${doc.parsed ? "" : " · без разбора текста"}</div>`).join("")}
        </div>
      ` : ""}
      <small>${new Date(message.createdAt).toLocaleString()}</small>
    </article>
  `).join("");

  chatEl.scrollTop = chatEl.scrollHeight;
}

function renderHistory() {
  if (!historyListEl) {
    return;
  }

  if (!currentSession) {
    historyListEl.innerHTML = "";
    return;
  }

  if (!savedRuns.length) {
    historyListEl.innerHTML = '<div class="muted">Сохраненных прогонов пока нет.</div>';
    return;
  }

  historyListEl.innerHTML = savedRuns.map((run) => `
    <article class="history-item">
      <strong>${escapeHtml(run.project_name)}</strong>
      <div class="muted">${escapeHtml(run.scenario_name || "Сценарий")} · ${new Date(run.created_at).toLocaleString()}</div>
      <button class="ghost" type="button" data-run-id="${run.id}" style="margin-top: 10px;">Загрузить прогон</button>
    </article>
  `).join("");
}

async function loadHistory() {
  if (!supabaseClient || !currentSession) {
    savedRuns = [];
    renderHistory();
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("research_runs")
      .select("id, project_name, scenario_name, created_at, output_payload")
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      throw error;
    }

    savedRuns = data || [];
    renderHistory();
  } catch (error) {
    savedRuns = [];
    historyListEl.innerHTML = `<div class="muted">Не удалось загрузить историю: ${escapeHtml(error.message)}</div>`;
  }
}

function renderSession(session) {
  currentSession = session || null;
  const userEmail = session?.user?.email;
  const isSignedIn = Boolean(userEmail);

  if (authForm) {
    authForm.hidden = isSignedIn;
  }

  if (sessionEl) {
    sessionEl.hidden = !isSignedIn;
  }

  if (isSignedIn) {
    if (sessionTextEl) {
      sessionTextEl.textContent = `Вы вошли как ${userEmail}`;
    }

    setStatus("Supabase подключен и авторизация работает.");
    setSaveStatus(latestResearchRun ? "Можно сохранить текущий прогон в Supabase." : "Сначала запустите исследование.");
    syncSaveButtonState();
    loadHistory();
    return;
  }

  if (sessionTextEl) {
    sessionTextEl.textContent = "";
  }

  setStatus("Supabase подключен. Можно работать локально или войти для сохранения.");
  setSaveStatus(latestResearchRun ? "Войдите, чтобы сохранить текущий прогон." : "Локальный режим активен.");
  syncSaveButtonState();
  savedRuns = [];
  renderHistory();
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  try {
    setStatus("Отправляю magic link...");
    const redirectUrl = window.SUPABASE_REDIRECT_URL || `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabaseClient.auth.signInWithOtp({
      email: emailInput.value.trim(),
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      throw error;
    }

    setStatus("Проверьте почту и откройте ссылку для входа.");
  } catch (error) {
    setStatus(`Ошибка авторизации: ${error.message}`, true);
  }
}

async function handleOAuthSignIn(provider) {
  try {
    setStatus(`Перенаправляю в ${provider}...`);
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
    setStatus(`Ошибка OAuth: ${error.message}`, true);
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
    setStatus(`Ошибка выхода: ${error.message}`, true);
  }
}

function getProjectMeta() {
  return {
    projectName: document.getElementById("project-name").value.trim() || "Синтетический кастдев",
    scenarioName: document.getElementById("scenario-name").value.trim() || "Базовый сценарий",
  };
}

function updateAttachmentLabel() {
  if (!uploadedDocuments.length) {
    attachmentsEl.textContent = "Документы можно добавлять прямо в чат. После загрузки они сразу участвуют в исследовании.";
    return;
  }

  attachmentsEl.textContent = `Подключено документов: ${uploadedDocuments.length}. Они уже войдут в следующий прогон исследования.`;
}

async function readFile(file) {
  const isText = file.type.startsWith("text/") || /\.(txt|md|json|csv)$/i.test(file.name);

  if (!isText) {
    return {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type || "binary",
      size: file.size,
      parsed: false,
      content: "",
    };
  }

  const content = await file.text();
  return {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type || "text/plain",
    size: file.size,
    parsed: true,
    content,
  };
}

async function handleFileSelection() {
  const files = Array.from(fileInputEl.files);

  if (!files.length) {
    return;
  }

  const docs = await Promise.all(files.map(readFile));
  uploadedDocuments = uploadedDocuments.concat(docs);
  renderAttachmentBar();
  updateAttachmentLabel();

  addMessage("user", `Добавил материалы для исследования: ${docs.map((doc) => doc.name).join(", ")}`, docs);

  const parsedCount = docs.filter((doc) => doc.parsed).length;
  addMessage(
    "assistant",
    parsedCount
      ? `Документы загружены и подключены к исследованию. Текст разобран у ${parsedCount} из ${docs.length} файлов. Можно сразу запускать исследование.`
      : "Документы загружены как вложения. Они сохранятся в полном пакете, а исследование можно запускать уже сейчас."
  );

  fileInputEl.value = "";
}

async function handleSendMessage() {
  const text = chatInputEl.value.trim();

  if (!text) {
    addMessage("assistant", "Сначала напишите вводные или добавьте документы.");
    return;
  }

  addMessage("user", text);
  addMessage("assistant", "Контекст принят. Можно продолжать дописывать вводные или сразу запускать исследование.");

  chatInputEl.value = "";
}

function tokenize(text) {
  const tokens = text
    .toLowerCase()
    .match(/[a-zа-яё0-9-]{4,}/gi) || [];

  return tokens.filter((token) => !stopwords.has(token));
}

function topKeywords(corpus) {
  const counts = new Map();

  tokenize(corpus).forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function scoreLabel(value) {
  if (value >= 5) {
    return "ядро";
  }

  if (value >= 3) {
    return "сильный";
  }

  return "слабый";
}

function emotionLabel(value) {
  return ["нейтрально", "раздражение", "боль", "паника"][value - 1] || "нейтрально";
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function renderPipeline() {
  if (!currentStatuses.length) {
    pipelineEl.classList.remove("active");
    pipelineEl.innerHTML = "";
    return;
  }

  pipelineEl.classList.add("active");
  pipelineEl.innerHTML = currentStatuses.map((step) => `
    <div class="status-step">
      <span>${escapeHtml(step.label)}</span>
      <strong class="${step.state === "done" ? "status-done" : step.state === "run" ? "status-run" : "status-wait"}">
        ${step.state === "done" ? "готово" : step.state === "run" ? "в работе" : "ожидает"}
      </strong>
    </div>
  `).join("");
}

function buildCorpus() {
  const userText = chatMessages
    .filter((message) => message.role === "user")
    .map((message) => message.text)
    .join("\n\n");

  const docsText = uploadedDocuments
    .filter((doc) => doc.parsed)
    .map((doc) => `${doc.name}\n${doc.content}`)
    .join("\n\n");

  return `${userText}\n\n${docsText}`.trim();
}

function buildResearch() {
  const meta = getProjectMeta();
  const corpus = buildCorpus();
  const keywords = topKeywords(corpus);
  const segmentCount = 6;

  const segments = Array.from({ length: segmentCount }, (_, index) => {
    const archetype = archetypes[index % archetypes.length];
    const keyword = keywords[index % Math.max(keywords.length, 1)] || "система";
    const repeatabilityCount = 2 + (index % 5);
    const emotionalIndex = Math.min(4, 2 + (index % 3));
    const urgency = 2 + ((index + 1) % 3);
    const commercial = 2 + (index % 3);

    return {
      id: `segment-${index + 1}`,
      name: archetype.name,
      context: `${archetype.situation} В ваших материалах рядом с этим сегментом часто всплывает тема "${keyword}".`,
      pain: archetype.pain,
      trigger: archetype.trigger,
      attempt: archetype.attempt,
      fear: archetype.fear,
      angle: archetype.angle,
      repeatabilityCount,
      repeatability: scoreLabel(repeatabilityCount),
      emotionalIndex,
      urgency,
      commercial,
      interviewAnswer: `Последний острый момент для этого сегмента выглядит так: ${archetype.trigger} После этого человек обычно думает: "${archetype.pain}"`,
      quote: `${archetype.pain} Мне нужен более понятный путь, а не еще один красивый совет.`,
    };
  });

  const topSegments = [...segments]
    .sort((a, b) => (b.urgency + b.commercial + b.emotionalIndex) - (a.urgency + a.commercial + a.emotionalIndex))
    .slice(0, 3);

  const quotes = segments
    .flatMap((segment) => [
      {
        text: segment.quote,
        segment: segment.name,
        repeatability: segment.repeatability,
        emotion: emotionLabel(segment.emotionalIndex),
      },
      {
        text: segment.trigger,
        segment: segment.name,
        repeatability: scoreLabel(Math.max(2, segment.repeatabilityCount - 1)),
        emotion: emotionLabel(Math.min(4, segment.emotionalIndex + 1)),
      },
    ])
    .slice(0, 10);

  const contentThemes = [
    `Хук: почему тема "${keywords[0] || "система"}" у аудитории звучит как симптом, а не как настоящая причина.`,
    `Хук: что люди уже пробовали до вас и почему это не сложилось в результат.`,
    `Лид-магнит: короткая диагностика, которая показывает, где именно ломается путь клиента.`,
    `Контент: как перевести сильную экспертизу в формулировку, которую рынок понимает без расшифровки.`,
    "Формат выхода: короткий отчет для чтения + полный пакет с сырьем и историей сообщений, чтобы не потерять контекст.",
  ];

  return {
    meta: {
      ...meta,
      productName: keywords[0] || "продукт",
      generatedAt: new Date().toLocaleString(),
      simulationMode: "Synthetic Only",
    },
    input: {
      ...meta,
      messages: chatMessages,
      documents: uploadedDocuments,
      corpusLength: corpus.length,
    },
    summary: {
      segmentCount: segments.length,
      interviewsCount: segments.length * 4,
      documentsCount: uploadedDocuments.length,
      topSegment: topSegments[0]?.name || "нет",
    },
    contextPolicy: {
      reportMode: "Короткий markdown-отчет",
      fullMode: "Полный JSON-пакет со всеми сообщениями и разобранными документами",
      note: "Чтобы ИИ не схлопнул нужный контекст, короткий отчет и полный пакет разделены.",
    },
    keywords,
    segments,
    topSegments,
    quotes,
    themes: contentThemes,
  };
}

function renderMetrics(summary) {
  metricsEl.innerHTML = `
    <div class="metric">
      <strong>${summary.segmentCount}</strong>
      <span>сегментов сформировано</span>
    </div>
    <div class="metric">
      <strong>${summary.interviewsCount}</strong>
      <span>синтетических ответов кастдева</span>
    </div>
    <div class="metric">
      <strong>${summary.documentsCount}</strong>
      <span>документов и вложений</span>
    </div>
    <div class="metric">
      <strong>${escapeHtml(summary.topSegment)}</strong>
      <span>главный сегмент сейчас</span>
    </div>
  `;
}

function renderSegments(segments) {
  segmentsEl.innerHTML = segments.map((segment) => `
    <article class="segment">
      <h3>${escapeHtml(segment.name)}</h3>
      <p class="muted">${escapeHtml(segment.context)}</p>
      <div class="segment-metrics">
        <div>${escapeHtml(segment.repeatability)}<span>повторяемость</span></div>
        <div>${escapeHtml(emotionLabel(segment.emotionalIndex))}<span>эмоция</span></div>
        <div>${segment.urgency}/4<span>срочность</span></div>
        <div>${segment.commercial}/4<span>коммерческий сигнал</span></div>
      </div>
      <p><strong>Боль:</strong> ${escapeHtml(segment.pain)}</p>
      <p><strong>Триггер:</strong> ${escapeHtml(segment.trigger)}</p>
      <p><strong>Что уже пробовали:</strong> ${escapeHtml(segment.attempt)}</p>
      <p><strong>Страх:</strong> ${escapeHtml(segment.fear)}</p>
      <p><strong>Интервью-ответ:</strong> ${escapeHtml(segment.interviewAnswer)}</p>
      <p><strong>Контентный угол:</strong> ${escapeHtml(segment.angle)}</p>
    </article>
  `).join("");
}

function renderQuotes(quotes) {
  quotesEl.innerHTML = quotes.map((quote) => `
    <blockquote>
      ${escapeHtml(quote.text)}
      <footer>${escapeHtml(quote.segment)} · ${escapeHtml(quote.repeatability)} · ${escapeHtml(quote.emotion)}</footer>
    </blockquote>
  `).join("");
}

function renderThemes(themes, contextPolicy) {
  themesEl.innerHTML = `
    ${themes.map((theme) => `<div class="theme-item">${escapeHtml(theme)}</div>`).join("")}
    <div class="theme-item"><strong>Политика контекста:</strong> ${escapeHtml(contextPolicy.note)}</div>
  `;
}

function renderResearch(research) {
  latestResearchRun = research;
  resultsEl.classList.add("active");
  renderMetrics(research.summary);
  renderSegments(research.topSegments);
  renderQuotes(research.quotes);
  renderThemes(research.themes, research.contextPolicy);
  setSaveStatus(currentSession ? "Текущий прогон готов к сохранению в Supabase." : "Прогон готов. Для сохранения войдите в Supabase.");
  syncSaveButtonState();
}

async function runResearch() {
  if (!chatMessages.some((message) => message.role === "user") && !uploadedDocuments.length) {
    addMessage("assistant", "Сначала загрузите документы или напишите вводные в чат.");
    return;
  }

  currentStatuses = [
    { label: "Собираю сигналы из сообщений и документов", state: "run" },
    { label: "Выделяю темы, боли и повторяющиеся формулировки", state: "wait" },
    { label: "Формирую синтетические сегменты аудитории", state: "wait" },
    { label: "Прогоняю синтетические кастдев-интервью", state: "wait" },
    { label: "Собираю итоговый отчет и полный пакет контекста", state: "wait" },
  ];
  renderPipeline();
  addMessage("assistant", "Запускаю исследование. Ниже будут видны статусы каждого шага.");

  for (let index = 0; index < currentStatuses.length; index += 1) {
    currentStatuses = currentStatuses.map((step, stepIndex) => ({
      ...step,
      state: stepIndex < index ? "done" : stepIndex === index ? "run" : "wait",
    }));
    renderPipeline();
    await sleep(700);
  }

  currentStatuses = currentStatuses.map((step) => ({ ...step, state: "done" }));
  renderPipeline();

  const research = buildResearch();
  renderResearch(research);
  addMessage(
    "assistant",
    `Готово. Сформировал ${research.summary.segmentCount} сегментов, выделил главный сегмент "${research.summary.topSegment}" и подготовил два выхода: короткий отчет и полный пакет без потери контекста.`
  );
}

function fillDemo() {
  document.getElementById("project-name").value = "Синтетический кастдев";
  document.getElementById("scenario-name").value = "Проверка премиального оффера";
  chatMessages = [];
  uploadedDocuments = [];
  latestResearchRun = null;
  currentStatuses = [];
  renderChat();
  renderAttachmentBar();
  renderPipeline();
  resultsEl.classList.remove("active");
  chatInputEl.value = "У нас продукт для экспертов и консультантов. Нужно понять сегменты аудитории, реальные боли, что они уже пробовали, какие формулировки использовать в оффере и в контенте.";
  updateAttachmentLabel();
  addMessage("assistant", "Напишите контекст исследования или загрузите документы. Когда материалов станет достаточно, нажмите «Запустить исследование».");
}

function handleAttachmentBarClick(event) {
  const button = event.target.closest("[data-doc-id]");

  if (!button) {
    return;
  }

  uploadedDocuments = uploadedDocuments.filter((doc) => doc.id !== button.dataset.docId);
  renderAttachmentBar();
  updateAttachmentLabel();
}

function toMarkdown(run) {
  const lines = [
    `# ${run.meta.projectName}`,
    ``,
    `Сценарий: ${run.meta.scenarioName}`,
    `Режим: ${run.meta.simulationMode}`,
    `Сгенерировано: ${run.meta.generatedAt}`,
    ``,
    `## Сводка`,
    `- Сегментов: ${run.summary.segmentCount}`,
    `- Синтетических ответов: ${run.summary.interviewsCount}`,
    `- Документов: ${run.summary.documentsCount}`,
    `- Главный сегмент: ${run.summary.topSegment}`,
    ``,
    `## Ключевые сегменты`,
  ];

  run.topSegments.forEach((segment) => {
    lines.push(`### ${segment.name}`);
    lines.push(`- Боль: ${segment.pain}`);
    lines.push(`- Триггер: ${segment.trigger}`);
    lines.push(`- Попытка решения: ${segment.attempt}`);
    lines.push(`- Страх: ${segment.fear}`);
    lines.push(`- Контентный угол: ${segment.angle}`);
    lines.push("");
  });

  lines.push("## Топ-фразы");
  run.quotes.forEach((quote) => {
    lines.push(`- ${quote.text} (${quote.segment}, ${quote.repeatability}, ${quote.emotion})`);
  });
  lines.push("");
  lines.push("## Темы и хуки");
  run.themes.forEach((theme) => {
    lines.push(`- ${theme}`);
  });
  lines.push("");
  lines.push("## Политика контекста");
  lines.push(run.contextPolicy.note);
  lines.push("Полный контекст и документы храните отдельно в JSON-пакете, чтобы не потерять сырье.");

  return lines.join("\n");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadReport() {
  if (!latestResearchRun) {
    addMessage("assistant", "Сначала запустите исследование, затем скачивайте отчет.");
    return;
  }

  downloadFile("otchet-kastdeva.md", toMarkdown(latestResearchRun), "text/markdown;charset=utf-8");
}

function downloadDossier() {
  if (!latestResearchRun) {
    addMessage("assistant", "Сначала запустите исследование, затем скачивайте полный пакет.");
    return;
  }

  downloadFile("polnyy-paket-konteksta.json", JSON.stringify(latestResearchRun, null, 2), "application/json;charset=utf-8");
}

async function saveLatestRun() {
  if (!supabaseClient) {
    setSaveStatus("Supabase клиент не готов.", true);
    return;
  }

  if (!currentSession) {
    setSaveStatus("Нужно войти, чтобы сохранить прогон.", true);
    return;
  }

  if (!latestResearchRun) {
    setSaveStatus("Сначала запустите исследование.", true);
    return;
  }

  try {
    setSaveStatus("Сохраняю прогон...");

    const { data: projectRow, error: projectError } = await supabaseClient
      .from("projects")
      .upsert(
        {
          user_id: currentSession.user.id,
          name: latestResearchRun.meta.projectName,
        },
        { onConflict: "user_id,name" }
      )
      .select("id")
      .single();

    if (projectError) {
      throw projectError;
    }

    const { data: scenarioRow, error: scenarioError } = await supabaseClient
      .from("scenarios")
      .upsert(
        {
          user_id: currentSession.user.id,
          project_id: projectRow.id,
          name: latestResearchRun.meta.scenarioName,
        },
        { onConflict: "project_id,name" }
      )
      .select("id")
      .single();

    if (scenarioError) {
      throw scenarioError;
    }

    const { error } = await supabaseClient.from("research_runs").insert({
      user_id: currentSession.user.id,
      project_id: projectRow.id,
      scenario_id: scenarioRow.id,
      project_name: latestResearchRun.meta.projectName,
      scenario_name: latestResearchRun.meta.scenarioName,
      simulation_mode: latestResearchRun.meta.simulationMode,
      input_payload: latestResearchRun.input,
      output_payload: latestResearchRun,
    });

    if (error) {
      throw error;
    }

    setSaveStatus(`Прогон сохранен в ${new Date().toLocaleTimeString()}.`);
    await loadHistory();
  } catch (error) {
    if (error.message?.includes("relation") || error.message?.includes("does not exist")) {
      setSaveStatus("Нужно сначала выполнить supabase-schema.sql в вашем проекте Supabase.", true);
      return;
    }

    setSaveStatus(`Ошибка сохранения: ${error.message}`, true);
  }
}

function handleHistoryClick(event) {
  const button = event.target.closest("[data-run-id]");

  if (!button) {
    return;
  }

  const run = savedRuns.find((item) => item.id === button.dataset.runId);

  if (!run?.output_payload) {
    setSaveStatus("Не удалось загрузить этот прогон.", true);
    return;
  }

  renderResearch(run.output_payload);
  addMessage("assistant", `Загрузил сохраненный прогон «${run.project_name} / ${run.scenario_name || "Сценарий"}».`);
}

async function initSupabase() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    setStatus("Добавьте supabase-config.js для авторизации и сохранения. Локальный режим уже работает.", true);
    return;
  }

  try {
    const { createClient } = window.supabase;
    supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    if (authForm) {
      authForm.addEventListener("submit", handleAuthSubmit);
    }

    if (signOutButton) {
      signOutButton.addEventListener("click", handleSignOut);
    }

    if (signInGoogleButton) {
      signInGoogleButton.addEventListener("click", () => handleOAuthSignIn("google"));
    }

    if (signInGithubButton) {
      signInGithubButton.addEventListener("click", () => handleOAuthSignIn("github"));
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      renderSession(session);
    });

    renderSession(data.session);
  } catch (error) {
    setStatus(`Ошибка Supabase: ${error.message}`, true);
  }
}

fileInputEl.addEventListener("change", handleFileSelection);
if (attachTriggerButton) {
  attachTriggerButton.addEventListener("click", () => {
    fileInputEl.click();
  });
}
sendMessageButton.addEventListener("click", handleSendMessage);
runResearchButton.addEventListener("click", runResearch);
downloadReportButton.addEventListener("click", downloadReport);
downloadDossierButton.addEventListener("click", downloadDossier);
saveRunButton.addEventListener("click", saveLatestRun);
if (attachmentBarEl) {
  attachmentBarEl.addEventListener("click", handleAttachmentBarClick);
}
if (historyListEl) {
  historyListEl.addEventListener("click", handleHistoryClick);
}

fillDemo();
initSupabase();
