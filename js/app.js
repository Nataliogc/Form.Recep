(function () {
  const CFG = window.APP_CONFIG || {};
  const $ = (s) => document.querySelector(s);

  // ===== Storage keys =====
  const LS_SEEN = "quiz_historial_por_modulo_v1"; // compatible con la versión anterior
  const LS_NAME = "form_recep_user_name_v1";
  const LS_THEME = "form_recep_theme_v1";
  const LS_RECENT = "form_recep_recent_sessions_v1";
  const LS_STAFF_CACHE = "form_recep_turnos_staff_v1";

  // ===== State =====
  let RAW = [];
  let REMOTE_RESULTS = [];
  let LOAD_META = { source: "", sourceLabel: "", updatedAt: null, errors: [] };

  let selectedDept = "";
  let selectedMod = "";
  let selectedLevel = "";
  let selectedSize = CFG.DEFAULT_SESSION_SIZE || 30;

  // Quiz session state
  let sessionQuestions = [];
  let currentIdx = 0;
  let answersMap = new Map(); // questionId -> { chosen, correct, isRight }
  let startTime = 0;
  let timerHandle = null;
  let currentStreak = 0;
  let bestStreak = 0;
  let isReviewMode = false;

  // ===== DOM Refs =====
  const viewSetup = $("#viewSetup");
  const viewQuiz = $("#viewQuiz");
  const viewSummary = $("#viewSummary");

  const headerUpdateText = $("#headerUpdateText");
  const updatedBadge = $("#updatedBadge");
  const footerMeta = $("#footerMeta");
  const btnTheme = $("#btnTheme");

  const heroTotal = $("#heroTotal");
  const heroSessions = $("#heroSessions");
  const heroAvg = $("#heroAvg");

  const whoSelect = $("#whoSelect");
  const staffSyncHint = $("#staffSyncHint");
  const practiceNameInput = $("#practiceName");
  const PRACTICE_VALUE = "__PRACTICAS__";
  const deptPills = $("#deptPills");
  const modSelect = $("#mod");
  const modCountHint = $("#modCountHint");
  const levelPills = $("#levelPills");
  const modeGrid = $("#modeGrid");
  const kpisEl = $("#kpis");
  const btnResetHistory = $("#btnResetHistory");
  const btnStart = $("#btnStart");

  const protoUpdatesCard = $("#protoUpdatesCard");
  const protoUpdatesList = $("#protoUpdatesList");
  const recentCard = $("#recentCard");
  const recentList = $("#recentList");
  const btnClearRecent = $("#btnClearRecent");

  const btnExitQuiz = $("#btnExitQuiz");
  const hudPos = $("#hudPos");
  const hudTimer = $("#hudTimer");
  const hudScore = $("#hudScore");
  const hudStreak = $("#hudStreak");
  const progressBar = $("#progressBar");
  const qBadges = $("#qBadges");
  const qId = $("#qId");
  const qTitle = $("#qTitle");
  const answersGrid = $("#answersGrid");
  const explainBox = $("#explainBox");
  const btnPrev = $("#btnPrev");
  const btnNext = $("#btnNext");

  const scoreRingFg = $("#scoreRingFg");
  const sumPct = $("#sumPct");
  const sumTitle = $("#sumTitle");
  const sumBody = $("#sumBody");
  const sheetStatus = $("#sheetStatus");
  const sumOk = $("#sumOk");
  const sumKo = $("#sumKo");
  const sumTime = $("#sumTime");
  const sumStreak = $("#sumStreak");
  const sumBreakdownWrap = $("#sumBreakdownWrap");
  const sumBreakdown = $("#sumBreakdown");
  const btnReviewWrong = $("#btnReviewWrong");
  const btnBackHome = $("#btnBackHome");
  const btnRepeatNew = $("#btnRepeatNew");

  // ===== Utilities =====
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function formatDateShort(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
    } catch (_) {
      return "";
    }
  }

  // ===== Theme (compatible con body.dark-mode de Protocolo-Recep) =====
  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-mode", isDark);
    btnTheme.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    try {
      localStorage.setItem(LS_THEME, theme);
    } catch (_) {}
  }

  function initTheme() {
    let saved = "";
    try {
      saved = localStorage.getItem(LS_THEME) || "";
    } catch (_) {}
    if (!saved) {
      saved = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    applyTheme(saved);
  }

  // ===== Plantilla oficial desde Turnos-new (Supabase) =====
  function getSelectedUserName() {
    const val = (whoSelect.value || "").trim();
    if (!val) return "";
    if (val === PRACTICE_VALUE) {
      const pname = (practiceNameInput.value || "").trim().replace(/\s+/g, " ");
      return pname.length >= 2 ? `Prácticas - ${pname}` : "";
    }
    return val;
  }

  function syncPracticeInputVisibility() {
    const isPractice = whoSelect.value === PRACTICE_VALUE;
    practiceNameInput.classList.toggle("hidden", !isPractice);
    if (isPractice) practiceNameInput.focus();
  }

  function formatHotelLabel(hotelId) {
    const h = String(hotelId || "").trim().toLowerCase();
    if (!h) return "Equipo Recepción";
    if (h.includes("guadiana")) return "Sercotel Guadiana";
    if (h.includes("cumbria")) return "Cumbria Spa&Hotel";
    return String(hotelId).trim();
  }

  function populateStaffSelect(staffList) {
    const groups = new Map();
    const seenNames = new Set();
    (Array.isArray(staffList) ? staffList : []).forEach((emp) => {
      const name = String(emp.nombre || "").trim();
      if (!name) return;
      const low = name.toLowerCase();
      if (seenNames.has(low)) return;
      seenNames.add(low);
      const hotelLabel = formatHotelLabel(emp.hotel_id);
      if (!groups.has(hotelLabel)) groups.set(hotelLabel, []);
      groups.get(hotelLabel).push(name);
    });

    let html = '<option value="">— Selecciona tu nombre —</option>';
    if (groups.size > 1) {
      [...groups.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], "es"))
        .forEach(([hotel, names]) => {
          names.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
          html += `<optgroup label="${esc(hotel)}">` + names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("") + "</optgroup>";
        });
    } else if (groups.size === 1) {
      const allNames = [...groups.values()].flat().sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
      html += allNames.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("");
    }

    html += `<optgroup label="Personal en formación"><option value="${PRACTICE_VALUE}">🎓 Prácticas (escribir nombre)</option></optgroup>`;

    whoSelect.innerHTML = html;
    staffSyncHint.textContent = seenNames.size
      ? `Personal activo (${seenNames.size}) + Prácticas`
      : "Sin conexión a Turnos (solo Prácticas)";

    try {
      const saved = (localStorage.getItem(LS_NAME) || "").trim();
      if (saved) {
        if (/^prácticas\s*-\s*/i.test(saved)) {
          whoSelect.value = PRACTICE_VALUE;
          practiceNameInput.value = saved.replace(/^prácticas\s*-\s*/i, "").trim();
        } else {
          const match = [...whoSelect.options].find((o) => o.value.toLowerCase() === saved.toLowerCase());
          if (match) whoSelect.value = match.value;
        }
      }
    } catch (_) {}

    practiceNameInput.classList.toggle("hidden", whoSelect.value !== PRACTICE_VALUE);
  }

  async function loadTurnosStaff() {
    const url = (CFG.TURNOS_SUPABASE_URL || "").replace(/\/+$/, "");
    const key = (CFG.TURNOS_SUPABASE_ANON_KEY || "").trim();

    if (url && key) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(
          `${url}/rest/v1/empleados?select=id,nombre,hotel_id,activo,estado_empresa,fecha_baja,orden&order=orden.asc,nombre.asc`,
          {
            headers: { apikey: key, Authorization: `Bearer ${key}` },
            cache: "no-store",
            signal: controller.signal,
          }
        );
        clearTimeout(timer);
        if (res.ok) {
          const rows = await res.json();
          const todayIso = new Date().toISOString().slice(0, 10);
          const active = (Array.isArray(rows) ? rows : []).filter((e) => {
            const name = String(e.nombre || "").trim();
            if (!name || /^(vacante|libre)\b/i.test(name)) return false;
            if (e.activo === false) return false;
            const st = String(e.estado_empresa || "").trim().toLowerCase();
            if (st && (st.includes("baja") || st.includes("inactiv") || st.includes("cese") || st.includes("elimin"))) return false;
            if (e.fecha_baja && String(e.fecha_baja).slice(0, 10) <= todayIso) return false;
            return true;
          });
          if (active.length) {
            try {
              localStorage.setItem(LS_STAFF_CACHE, JSON.stringify(active));
            } catch (_) {}
            populateStaffSelect(active);
            updateKPIs();
            return;
          }
        }
      } catch (_) {}
    }

    // Fallback a caché local de Turnos si no hay red
    try {
      const cached = JSON.parse(localStorage.getItem(LS_STAFF_CACHE) || "[]");
      if (Array.isArray(cached) && cached.length) {
        populateStaffSelect(cached);
        staffSyncHint.textContent = `Plantilla Turnos (caché · ${cached.length})`;
        updateKPIs();
        return;
      }
    } catch (_) {}

    populateStaffSelect([]);
    updateKPIs();
  }

  // ===== Puente vivo con Protocolo-Recep =====
  async function loadProtocoloUpdates() {
    if (location.protocol === "file:" || !CFG.PROTOCOLO_DATA_JSON_URL) return;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${CFG.PROTOCOLO_DATA_JSON_URL}?_ts=${Date.now()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!res.ok) return;
      const list = await res.json();
      if (!Array.isArray(list)) return;

      const valid = list
        .filter((p) => p && p.title && p.title !== "No Title" && p.updated)
        .sort((a, b) => new Date(b.updated) - new Date(a.updated))
        .slice(0, 4);

      if (!valid.length) return;
      const baseUrl = CFG.PROTOCOLO_RECEP_URL || "https://cumbriaspahotel.github.io/Protocolo-Recep/";
      protoUpdatesList.innerHTML = valid
        .map((p) => {
          const cleanTitle = String(p.title || "").replace(/\{[^}]*\}/g, "").trim();
          return `
          <a class="proto-item" href="${esc(baseUrl)}" target="_blank" rel="noopener">
            <div>
              <strong>${esc(cleanTitle)}</strong>
              <small><i class="far fa-clock"></i> ${esc(formatDateShort(p.updated))}${p.section ? ` · Sec. ${esc(p.section)}` : ""}</small>
            </div>
            <i class="fas fa-external-link-alt"></i>
          </a>`;
        })
        .join("");
      protoUpdatesCard.classList.remove("hidden");
    } catch (_) {
      // Silencioso si no hay conexión o CORS
    }
  }

  // ===== Seen history (no-repeat per DTO + Mod) =====
  const keyFor = (d, m) => `${(d || "").trim()}||${(m || "").trim()}`;
  function loadSeen() {
    try {
      return JSON.parse(localStorage.getItem(LS_SEEN) || "{}");
    } catch (_) {
      return {};
    }
  }
  function saveSeen(h) {
    try {
      localStorage.setItem(LS_SEEN, JSON.stringify(h));
    } catch (_) {}
  }
  function getUsedIds(d, m) {
    const h = loadSeen();
    const arr = h[keyFor(d, m)];
    return new Set(Array.isArray(arr) ? arr : []);
  }
  function pushUsedIds(d, m, ids) {
    const h = loadSeen();
    const k = keyFor(d, m);
    const set = new Set(Array.isArray(h[k]) ? h[k] : []);
    ids.forEach((id) => set.add(id));
    h[k] = Array.from(set).slice(-600);
    saveSeen(h);
  }
  function clearUsedIds(d, m) {
    const h = loadSeen();
    delete h[keyFor(d, m)];
    saveSeen(h);
  }

  // ===== Recent & Remote per-person stats =====
  function canonName(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function parseSimpleCsv(text) {
    const clean = text.replace(/^\uFEFF/, "");
    const first = clean.split(/\r?\n/)[0] || "";
    const delim = first.split(";").length > first.split(",").length ? ";" : ",";
    const rows = [];
    let row = [], cur = "", inQ = false;
    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i], nx = clean[i + 1];
      if (inQ) {
        if (ch === '"' && nx === '"') { cur += '"'; i++; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === delim) { row.push(cur); cur = ""; }
        else if (ch === "\r" && nx === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; i++; }
        else if (ch === "\n" || ch === "\r") { row.push(cur); rows.push(row); row = []; cur = ""; }
        else cur += ch;
      }
    }
    if (cur.length || row.length) { row.push(cur); rows.push(row); }
    const nonEmpty = rows.filter((r) => r.some((c) => String(c).trim() !== ""));
    if (nonEmpty.length < 2) return [];
    const heads = nonEmpty[0].map((h) => String(h).trim().toLowerCase());
    return nonEmpty.slice(1).map((cols) => {
      const o = {};
      heads.forEach((h, i) => (o[h] = (cols[i] ?? "").trim()));
      return o;
    });
  }

  async function loadRemoteResultsForStats() {
    const csvUrl = (CFG.RESULTS_CSV_URL || "").trim();
    if (!csvUrl) return;
    try {
      const sep = csvUrl.includes("?") ? "&" : "?";
      const res = await fetch(`${csvUrl}${sep}_ts=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const rows = parseSimpleCsv(await res.text());
      const pick = (o, ks) => {
        for (const k of ks) if (k in o && String(o[k]).trim() !== "") return String(o[k]).trim();
        return "";
      };
      REMOTE_RESULTS = rows
        .map((r) => {
          const nombre = pick(r, ["nombre", "empleado", "usuario", "recepcionista", "name"]);
          const total = Number(pick(r, ["total", "preguntas"])) || 0;
          const aciertos = Number(pick(r, ["aciertos", "ok", "correctas"])) || 0;
          const pctRaw = pick(r, ["pct", "porcentaje", "nota", "score"]);
          const pct = pctRaw !== "" ? Math.round(Number(pctRaw.replace("%", "").replace(",", "."))) : total ? Math.round((aciertos / total) * 100) : 0;
          return {
            nombre,
            nameKey: canonName(nombre),
            dto: pick(r, ["dto", "departamento", "hotel"]),
            modulo: pick(r, ["modulo", "módulo", "categoría", "categoria"]),
            nivel: pick(r, ["nivel", "level"]),
            total,
            aciertos,
            pct,
            date: pick(r, ["fecha", "timestamp", "date", "marca temporal"]),
          };
        })
        .filter((x) => x.nameKey && x.total > 0)
        .reverse();
      renderRecentAndHeroStats();
    } catch (_) {}
  }

  function loadRecent() {
    try {
      const list = JSON.parse(localStorage.getItem(LS_RECENT) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }
  function pushRecent(entry) {
    const list = loadRecent();
    list.unshift(entry);
    try {
      localStorage.setItem(LS_RECENT, JSON.stringify(list.slice(0, 20)));
    } catch (_) {}
  }
  function renderRecentAndHeroStats() {
    heroTotal.textContent = RAW.length;
    const selectedName = getSelectedUserName();
    if (!selectedName) {
      heroSessions.textContent = "0";
      heroAvg.textContent = "—";
      recentCard.classList.add("hidden");
      return;
    }

    const key = canonName(selectedName);
    const remoteForPerson = REMOTE_RESULTS.filter((x) => x.nameKey === key);
    const localForPerson = loadRecent().filter((x) => x.nombre && canonName(x.nombre) === key);
    const list = remoteForPerson.length ? remoteForPerson : localForPerson;

    heroSessions.textContent = list.length;
    if (list.length) {
      const avg = Math.round(list.reduce((acc, x) => acc + (x.pct || 0), 0) / list.length);
      heroAvg.textContent = `${avg}%`;
      recentCard.classList.remove("hidden");
      recentList.innerHTML = list
        .slice(0, 5)
        .map((item) => {
          const cls = item.pct >= 90 ? "ok" : item.pct >= 60 ? "warn" : "ko";
          const title = item.modulo || item.dto || "Sesión general";
          const sub = [formatDateShort(item.date) || item.date || "", `${item.aciertos}/${item.total}`, item.nivel].filter(Boolean).join(" · ");
          return `
            <div class="history-item">
              <div>
                <strong>${esc(title)}</strong>
                <small>${esc(sub)}</small>
              </div>
              <span class="score-badge ${cls}">${item.pct}%</span>
            </div>`;
        })
        .join("");
    } else {
      heroAvg.textContent = "—";
      recentCard.classList.add("hidden");
    }
  }

  // ===== View switching =====
  function showView(name) {
    viewSetup.classList.toggle("hidden", name !== "setup");
    viewQuiz.classList.toggle("hidden", name !== "quiz");
    viewSummary.classList.toggle("hidden", name !== "summary");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ===== Filters & Setup UI =====
  function getFilteredBase() {
    return RAW.filter(
      (q) =>
        (!selectedDept || q.dto === selectedDept) &&
        (!selectedMod || q.mod === selectedMod) &&
        (!selectedLevel || q.nivel === selectedLevel)
    );
  }

  function renderDeptPills() {
    const depts = uniq(RAW.map((q) => q.dto)).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    const items = [{ value: "", label: "Todos", count: RAW.length }].concat(
      depts.map((d) => ({ value: d, label: d, count: RAW.filter((q) => q.dto === d).length }))
    );

    deptPills.innerHTML = items
      .map(
        (it) => `
        <button type="button" class="pill ${selectedDept === it.value ? "active" : ""}" data-dept="${esc(it.value)}">
          ${esc(it.label)} <span class="count-chip">${it.count}</span>
        </button>`
      )
      .join("");

    deptPills.querySelectorAll(".pill").forEach((btn) => {
      btn.onclick = () => {
        selectedDept = btn.dataset.dept || "";
        selectedMod = "";
        renderDeptPills();
        renderModuleOptions();
        renderLevelPills();
        updateKPIs();
      };
    });
  }

  function renderModuleOptions() {
    const subset = RAW.filter((q) => !selectedDept || q.dto === selectedDept);
    const counts = new Map();
    subset.forEach((q) => {
      if (!q.mod) return;
      counts.set(q.mod, (counts.get(q.mod) || 0) + 1);
    });
    const mods = [...counts.keys()].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

    modSelect.innerHTML =
      `<option value="">Todos los módulos (${subset.length})</option>` +
      mods.map((m) => `<option value="${esc(m)}">${esc(m)} (${counts.get(m)})</option>`).join("");
    modSelect.value = selectedMod;
    modCountHint.textContent = `${mods.length} módulos disponibles`;
  }

  function renderLevelPills() {
    const subset = RAW.filter((q) => (!selectedDept || q.dto === selectedDept) && (!selectedMod || q.mod === selectedMod));
    const order = ["Básico", "Intermedio", "Avanzado"];
    const present = uniq(subset.map((q) => q.nivel)).sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b, "es");
    });

    if (selectedLevel && !present.includes(selectedLevel)) selectedLevel = "";

    const items = [{ value: "", label: "Todos", count: subset.length }].concat(
      present.map((lv) => ({ value: lv, label: lv, count: subset.filter((q) => q.nivel === lv).length }))
    );

    levelPills.innerHTML = items
      .map(
        (it) => `
        <button type="button" class="pill ${selectedLevel === it.value ? "active" : ""}" data-level="${esc(it.value)}">
          ${esc(it.label)} <span class="count-chip">${it.count}</span>
        </button>`
      )
      .join("");

    levelPills.querySelectorAll(".pill").forEach((btn) => {
      btn.onclick = () => {
        selectedLevel = btn.dataset.level || "";
        renderLevelPills();
        updateKPIs();
      };
    });
  }

  function renderModeGrid() {
    const sizes = CFG.SESSION_SIZES || [
      { id: "quick", label: "Rápido", count: 10, desc: "~5 min" },
      { id: "standard", label: "Estándar", count: 30, desc: "~15 min" },
      { id: "all", label: "Completo", count: 9999, desc: "Todo el banco" },
    ];
    modeGrid.innerHTML = sizes
      .map(
        (s) => `
        <button type="button" class="mode-card ${selectedSize === s.count ? "active" : ""}" data-size="${s.count}">
          <strong>${esc(s.label)} ${s.count < 9999 ? `(${s.count})` : ""}</strong>
          <span>${esc(s.desc)}</span>
        </button>`
      )
      .join("");

    modeGrid.querySelectorAll(".mode-card").forEach((card) => {
      card.onclick = () => {
        selectedSize = Number(card.dataset.size) || 30;
        renderModeGrid();
        updateKPIs();
      };
    });
  }

  function updateKPIs() {
    const base = getFilteredBase();
    const used = getUsedIds(selectedDept, selectedMod);
    const unseen = base.filter((q) => !used.has(q.id)).length;
    const poolSize = unseen > 0 ? unseen : base.length;
    const willTake = Math.min(selectedSize, poolSize);

    kpisEl.innerHTML = `
      <span>Banco: <b>${base.length}</b></span>
      <span>Sin ver: <b>${unseen}</b></span>
      <span>En esta sesión: <b>${willTake}</b></span>`;

    btnResetHistory.classList.toggle("hidden", unseen === base.length || base.length === 0);

    const hasName = getSelectedUserName().length >= 2;
    const waitingPractice = whoSelect.value === PRACTICE_VALUE && !hasName;
    btnStart.disabled = !(hasName && base.length > 0);
    btnStart.innerHTML = waitingPractice
      ? '<i class="fas fa-user-graduate"></i> Escribe tu nombre (Prácticas) para empezar'
      : !hasName
      ? '<i class="fas fa-user"></i> Selecciona tu nombre para empezar'
      : base.length === 0
      ? "Sin preguntas en este filtro"
      : `<i class="fas fa-play"></i> Comenzar sesión (${willTake} preguntas)`;
  }

  // ===== Quiz Runner =====
  function stopTimer() {
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
  }

  function startTimer() {
    stopTimer();
    startTime = Date.now();
    hudTimer.textContent = "00:00";
    timerHandle = setInterval(() => {
      const sec = Math.floor((Date.now() - startTime) / 1000);
      hudTimer.textContent = formatTime(sec);
    }, 1000);
  }

  function startSession(customQuestions = null, review = false) {
    isReviewMode = review;
    if (customQuestions) {
      sessionQuestions = customQuestions.slice();
    } else {
      const base = getFilteredBase();
      if (!base.length) return;
      const used = getUsedIds(selectedDept, selectedMod);
      let pool = base.filter((q) => !used.has(q.id));
      if (pool.length === 0) pool = base;
      const take = Math.min(selectedSize, pool.length);
      sessionQuestions = shuffle(pool).slice(0, take);
    }

    currentIdx = 0;
    answersMap = new Map();
    currentStreak = 0;
    bestStreak = 0;

    try {
      localStorage.setItem(LS_NAME, getSelectedUserName());
    } catch (_) {}

    showView("quiz");
    startTimer();
    renderQuestion();
  }

  function getScoreCounts() {
    let ok = 0,
      ko = 0;
    answersMap.forEach((v) => {
      if (v.isRight) ok++;
      else ko++;
    });
    return { ok, ko };
  }

  function updateQuizHud() {
    const total = sessionQuestions.length;
    const { ok, ko } = getScoreCounts();
    const pct = total ? ((currentIdx + 1) / total) * 100 : 0;

    progressBar.style.width = `${pct.toFixed(1)}%`;
    hudPos.textContent = `${currentIdx + 1} / ${total}`;
    hudScore.innerHTML = `<span class="ok-txt">${ok} ✓</span> · <span class="ko-txt">${ko} ✕</span>`;

    if (currentStreak >= 2) {
      hudStreak.innerHTML = `<i class="fas fa-fire"></i> Racha: ${currentStreak}`;
      hudStreak.classList.remove("hidden");
    } else {
      hudStreak.classList.add("hidden");
    }
  }

  function levelTagClass(level) {
    const l = (level || "").toLowerCase();
    if (l.includes("bás") || l.includes("bas")) return "tag-level-basico";
    if (l.includes("inter")) return "tag-level-intermedio";
    if (l.includes("avan")) return "tag-level-avanzado";
    return "";
  }

  function renderQuestion() {
    const q = sessionQuestions[currentIdx];
    if (!q) return;

    updateQuizHud();

    const badges = [];
    if (q.dto) badges.push(`<span class="tag">${esc(q.dto)}</span>`);
    if (q.mod) badges.push(`<span class="tag">${esc(q.mod)}</span>`);
    if (q.nivel) badges.push(`<span class="tag ${levelTagClass(q.nivel)}">${esc(q.nivel)}</span>`);
    if (isReviewMode) badges.push(`<span class="tag tag-level-intermedio">Repaso de falladas</span>`);
    qBadges.innerHTML = badges.join("");
    qId.textContent = `#${q.id}`;
    qTitle.textContent = q.text;

    const prevAns = answersMap.get(q.id);
    const letters = ["A", "B", "C", "D"].filter((L) => q[L]);

    answersGrid.innerHTML = letters
      .map((L) => {
        let cls = "";
        if (prevAns) {
          if (L === q.correct) cls = "correct";
          else if (L === prevAns.chosen && !prevAns.isRight) cls = "wrong";
        }
        return `
          <button type="button" class="answer-btn ${cls}" data-letter="${L}" ${prevAns ? "disabled" : ""}>
            <span class="ans-key">${L}</span>
            <span>${esc(q[L])}</span>
          </button>`;
      })
      .join("");

    if (prevAns) {
      showExplanation(q, prevAns.isRight);
      btnNext.disabled = false;
    } else {
      explainBox.classList.add("hidden");
      explainBox.classList.remove("is-right", "is-wrong");
      explainBox.innerHTML = "";
      btnNext.disabled = true;
      answersGrid.querySelectorAll(".answer-btn").forEach((btn) => {
        btn.onclick = () => onAnswer(q, btn.dataset.letter);
      });
    }

    btnPrev.disabled = currentIdx === 0;
    btnNext.innerHTML =
      currentIdx === sessionQuestions.length - 1
        ? 'Ver resultado <i class="fas fa-flag-checkered"></i>'
        : 'Siguiente <i class="fas fa-chevron-right"></i>';
  }

  function showExplanation(q, isRight) {
    const corrText = q[q.correct] ? ` ${esc(q[q.correct])}` : "";
    const statusLabel = isRight
      ? '<i class="fas fa-check-circle" style="color:var(--accent-green)"></i> ¡Correcto!'
      : `<i class="fas fa-times-circle" style="color:var(--accent-red)"></i> Respuesta correcta: ${esc(q.correct)}.${corrText}`;
    const whyHtml = q.why ? `<p>${esc(q.why)}</p>` : "";

    const hint = (CFG.MODULE_PROTOCOL_HINTS || {})[q.mod] || { section: "Manual Operativo" };
    const manualUrl = CFG.PROTOCOLO_RECEP_URL || "https://cumbriaspahotel.github.io/Protocolo-Recep/";

    explainBox.classList.toggle("is-right", isRight);
    explainBox.classList.toggle("is-wrong", !isRight);
    explainBox.innerHTML = `
      <strong>${statusLabel}</strong>
      ${whyHtml}
      <div class="explain-proto-link">
        <span><i class="fas fa-book"></i> Referencia: <b>${esc(hint.section)}</b></span>
        <a href="${esc(manualUrl)}" target="_blank" rel="noopener">
          Consultar en Protocolo-Recep <i class="fas fa-external-link-alt"></i>
        </a>
      </div>`;
    explainBox.classList.remove("hidden");
  }

  function onAnswer(q, letter) {
    if (answersMap.has(q.id)) return;
    const isRight = letter === q.correct;
    answersMap.set(q.id, { chosen: letter, correct: q.correct, isRight });

    if (isRight) {
      currentStreak++;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }

    answersGrid.querySelectorAll(".answer-btn").forEach((btn) => {
      const l = btn.dataset.letter;
      btn.disabled = true;
      if (l === q.correct) btn.classList.add("correct");
      else if (l === letter && !isRight) btn.classList.add("wrong");
    });

    showExplanation(q, isRight);
    btnNext.disabled = false;
    updateQuizHud();
  }

  // ===== Results & Google Sheets Submission =====
  function sendResultToSheet(payload) {
    const endpoint = CFG.RESULTS_ENDPOINT;
    if (!endpoint || location.protocol === "file:") return Promise.resolve(false);
    try {
      return fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        mode: "no-cors",
      })
        .then(() => true)
        .catch(() => {
          try {
            return navigator.sendBeacon(endpoint, JSON.stringify(payload));
          } catch (_) {
            return false;
          }
        });
    } catch (_) {
      return Promise.resolve(false);
    }
  }

  function getFeedback(pct) {
    if (pct < 60) {
      return {
        title: "Toca repasar en Protocolo-Recep",
        body: "Resultado por debajo del 60%. Revisa los protocolos en el manual operativo y repite el test en 48–72h para consolidarlo.",
        color: "var(--accent-red)",
      };
    }
    if (pct < 90) {
      return {
        title: "Buen avance, con margen de mejora",
        body: "Vas por muy buen camino (60–89%). Usa «Revisar solo falladas» para fijar los detalles que se escaparon.",
        color: "#d97706",
      };
    }
    return {
      title: "¡Excelente dominio del estándar!",
      body: "Más del 90% demuestra constancia y dominio del manual. Gracias por elevar la calidad del servicio en Guadiana y Cumbria.",
      color: "var(--accent-green)",
    };
  }

  function finishSession() {
    stopTimer();
    const dur = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const { ok, ko } = getScoreCounts();
    const total = sessionQuestions.length;
    const pct = total ? Math.round((ok / total) * 100) : 0;
    const wrongIds = sessionQuestions.filter((q) => {
      const a = answersMap.get(q.id);
      return a && !a.isRight;
    });

    if (!isReviewMode) {
      pushUsedIds(
        selectedDept,
        selectedMod,
        sessionQuestions.map((q) => q.id)
      );

      const newEntry = {
        nombre: getSelectedUserName(),
        nameKey: canonName(getSelectedUserName()),
        date: new Date().toISOString(),
        dto: selectedDept,
        modulo: selectedMod,
        nivel: selectedLevel,
        total,
        aciertos: ok,
        fallos: ko,
        pct,
      };
      pushRecent(newEntry);
      REMOTE_RESULTS.unshift(newEntry);

      const payload = {
        nombre: getSelectedUserName(),
        dto: selectedDept,
        modulo: selectedMod,
        nivel: selectedLevel,
        total,
        aciertos: ok,
        fallos: ko,
        duracion_seg: dur,
        ids_preguntas: sessionQuestions.map((q) => q.id),
        detalle_fallos: wrongIds.map((q) => q.id),
      };

      sheetStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando resultado a Google Sheets…';
      sendResultToSheet(payload).then((sent) => {
        sheetStatus.innerHTML = sent
          ? '<i class="fas fa-check-circle"></i> Resultado registrado en Google Sheets'
          : '<i class="fas fa-laptop"></i> Modo local · resultado guardado en este navegador';
      });
    } else {
      sheetStatus.innerHTML = '<i class="fas fa-redo"></i> Sesión de repaso (no duplica registro en Sheets)';
    }

    const fb = getFeedback(pct);
    sumPct.textContent = `${pct}%`;
    sumTitle.textContent = fb.title;
    sumBody.textContent = fb.body;
    sumOk.textContent = ok;
    sumKo.textContent = ko;
    sumTime.textContent = formatTime(dur);
    sumStreak.textContent = bestStreak;

    const circumference = 2 * Math.PI * 52;
    scoreRingFg.style.stroke = fb.color;
    scoreRingFg.style.strokeDashoffset = circumference;
    requestAnimationFrame(() => {
      scoreRingFg.style.strokeDashoffset = circumference * (1 - pct / 100);
    });

    const byMod = new Map();
    sessionQuestions.forEach((q) => {
      const m = q.mod || "General";
      if (!byMod.has(m)) byMod.set(m, { ok: 0, total: 0 });
      const entry = byMod.get(m);
      entry.total++;
      if (answersMap.get(q.id)?.isRight) entry.ok++;
    });

    if (byMod.size > 0) {
      sumBreakdownWrap.classList.remove("hidden");
      sumBreakdown.innerHTML = [...byMod.entries()]
        .map(([modName, st]) => {
          const mpct = Math.round((st.ok / st.total) * 100);
          const cls = mpct >= 90 ? "ok" : mpct >= 60 ? "warn" : "ko";
          return `
            <div class="breakdown-row">
              <span>${esc(modName)}</span>
              <span class="score-badge ${cls}">${st.ok}/${st.total} (${mpct}%)</span>
            </div>`;
        })
        .join("");
    } else {
      sumBreakdownWrap.classList.add("hidden");
    }

    btnReviewWrong.disabled = wrongIds.length === 0;
    btnReviewWrong.innerHTML =
      wrongIds.length > 0
        ? `<i class="fas fa-redo"></i> Revisar falladas (${wrongIds.length})`
        : '<i class="fas fa-check"></i> Sin fallos que revisar';

    btnReviewWrong.onclick = () => startSession(wrongIds, true);

    renderRecentAndHeroStats();
    updateKPIs();
    showView("summary");
  }

  // ===== Sync metadata =====
  function updateSyncUI() {
    const dateStr = formatDateShort(LOAD_META.updatedAt);
    headerUpdateText.textContent = dateStr
      ? `Última actualización: ${dateStr}`
      : "Banco de formación activo";
    updatedBadge.textContent = dateStr ? `Actualizado · ${dateStr}` : "Banco activo";
    footerMeta.textContent = `v${CFG.version || "2.1.1"} · ${RAW.length} preguntas`;
  }

  async function refreshData() {
    const result = await window.DataLoader.loadQuestions();
    RAW = result.questions || [];
    LOAD_META = result;
    updateSyncUI();
    renderDeptPills();
    renderModuleOptions();
    renderLevelPills();
    renderModeGrid();
    renderRecentAndHeroStats();
    updateKPIs();
  }

  // ===== Events =====
  btnTheme.onclick = () => {
    const isDark = document.body.classList.contains("dark-mode");
    applyTheme(isDark ? "light" : "dark");
  };

  whoSelect.onchange = () => {
    syncPracticeInputVisibility();
    renderRecentAndHeroStats();
    updateKPIs();
  };
  practiceNameInput.oninput = () => {
    renderRecentAndHeroStats();
    updateKPIs();
  };
  modSelect.onchange = () => {
    selectedMod = modSelect.value || "";
    renderLevelPills();
    updateKPIs();
  };

  btnResetHistory.onclick = () => {
    clearUsedIds(selectedDept, selectedMod);
    updateKPIs();
  };

  btnClearRecent.onclick = () => {
    try {
      localStorage.removeItem(LS_RECENT);
    } catch (_) {}
    renderRecentAndHeroStats();
  };

  btnStart.onclick = () => startSession();

  btnExitQuiz.onclick = () => {
    if (answersMap.size === 0 || confirm("¿Salir de la sesión actual? El progreso no guardado se perderá.")) {
      stopTimer();
      showView("setup");
    }
  };

  btnPrev.onclick = () => {
    if (currentIdx > 0) {
      currentIdx--;
      renderQuestion();
    }
  };

  btnNext.onclick = () => {
    if (currentIdx < sessionQuestions.length - 1) {
      currentIdx++;
      renderQuestion();
    } else {
      finishSession();
    }
  };

  btnBackHome.onclick = () => showView("setup");
  btnRepeatNew.onclick = () => startSession();

  document.addEventListener("keydown", (e) => {
    if (viewQuiz.classList.contains("hidden")) return;
    const key = e.key.toUpperCase();
    if (["A", "B", "C", "D"].includes(key)) {
      const q = sessionQuestions[currentIdx];
      if (q && q[key] && !answersMap.has(q.id)) onAnswer(q, key);
    } else if (e.key === "Enter" || e.key === "ArrowRight") {
      if (!btnNext.disabled) btnNext.click();
    } else if (e.key === "ArrowLeft") {
      if (!btnPrev.disabled) btnPrev.click();
    }
  });

  // ===== Boot =====
  (async function boot() {
    initTheme();
    await Promise.all([refreshData(), loadTurnosStaff()]);
    renderRecentAndHeroStats();
    loadRemoteResultsForStats();
    loadProtocoloUpdates();

    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  })();
})();
