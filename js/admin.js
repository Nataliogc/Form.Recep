(function () {
  const CFG = window.APP_CONFIG || {};
  const $ = (s) => document.querySelector(s);

  const SS_AUTH = "form_recep_admin_auth_v1";
  const LS_THEME = "form_recep_theme_v1";
  const LS_RESULTS_CSV = "form_recep_admin_results_csv_v1";
  const LS_PEOPLE_RULES = "form_recep_admin_people_rules_v1";

  let ALL_RESULTS = [];
  let QUESTIONS_BY_ID = new Map();
  let ALL_QUESTIONS = [];
  let TURNOS_STAFF = [];
  let chartModules = null;
  let chartDist = null;
  let chartTrend = null;
  let mergeSourceKey = "";
  let mergeSourceDisplay = "";

  // DOM
  const loginView = $("#loginView");
  const dashboardView = $("#dashboardView");
  const loginForm = $("#loginForm");
  const passInput = $("#passInput");
  const loginError = $("#loginError");

  const btnTheme = $("#btnTheme");
  const btnLogout = $("#btnLogout");
  const btnSourceModal = $("#btnSourceModal");

  const sourceBanner = $("#sourceBanner");
  const sourceBannerText = $("#sourceBannerText");
  const btnRefreshResults = $("#btnRefreshResults");

  const fSearch = $("#fSearch");
  const fDept = $("#fDept");
  const fMod = $("#fMod");
  const fRange = $("#fRange");
  const btnExportCsv = $("#btnExportCsv");
  const btnPrintReport = $("#btnPrintReport");

  const kpiSessions = $("#kpiSessions");
  const kpiAvg = $("#kpiAvg");
  const kpiExcellence = $("#kpiExcellence");
  const kpiPeople = $("#kpiPeople");
  const kpiTime = $("#kpiTime");

  const btnManageRules = $("#btnManageRules");
  const peopleCountTag = $("#peopleCountTag");
  const peopleTableBody = $("#peopleTableBody");
  const missedQuestionsList = $("#missedQuestionsList");
  const rowsCountTag = $("#rowsCountTag");
  const sessionsTableBody = $("#sessionsTableBody");
  const histScoreFilter = $("#histScoreFilter");
  const histPageSize = $("#histPageSize");
  const histPager = $("#histPager");
  const btnHistPrev = $("#btnHistPrev");
  const btnHistNext = $("#btnHistNext");
  const histPageInfo = $("#histPageInfo");
  let histPage = 1;

  const sourceModal = $("#sourceModal");
  const btnCloseSourceModal = $("#btnCloseSourceModal");
  const resultsCsvUrlInput = $("#resultsCsvUrlInput");
  const btnClearSourceUrl = $("#btnClearSourceUrl");
  const btnSaveSourceUrl = $("#btnSaveSourceUrl");

  const mergeModal = $("#mergeModal");
  const btnCloseMergeModal = $("#btnCloseMergeModal");
  const mergeSourceLabel = $("#mergeSourceLabel");
  const mergeTargetSelect = $("#mergeTargetSelect");
  const btnCancelMerge = $("#btnCancelMerge");
  const btnConfirmMerge = $("#btnConfirmMerge");

  const rulesModal = $("#rulesModal");
  const btnCloseRulesModal = $("#btnCloseRulesModal");
  const rulesListBox = $("#rulesListBox");
  const btnResetAllRules = $("#btnResetAllRules");
  const btnDoneRules = $("#btnDoneRules");

  const tabPendingBadge = $("#tabPendingBadge");
  const tabBankBadge = $("#tabBankBadge");
  const compTotal = $("#compTotal");
  const compUpToDate = $("#compUpToDate");
  const compStale = $("#compStale");
  const compNever = $("#compNever");
  const compHotelFilter = $("#compHotelFilter");
  const btnCopyReminder = $("#btnCopyReminder");
  const complianceTableBody = $("#complianceTableBody");

  const qbSearch = $("#qbSearch");
  const qbMod = $("#qbMod");
  const qbLevel = $("#qbLevel");
  const qbCountTag = $("#qbCountTag");
  const qbankList = $("#qbankList");

  const btnOpenRulesFromSystem = $("#btnOpenRulesFromSystem");
  const personModal = $("#personModal");
  const btnClosePersonModal = $("#btnClosePersonModal");
  const personModalTitle = $("#personModalTitle");
  const personModalBody = $("#personModalBody");

  const esc = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  function formatTime(sec) {
    const n = Number(sec) || 0;
    const m = Math.floor(n / 60);
    const s = Math.round(n % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function formatDate(d) {
    if (!d || isNaN(d.getTime())) return "—";
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ===== Theme =====
  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-mode", isDark);
    btnTheme.innerHTML = isDark ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    try {
      localStorage.setItem(LS_THEME, theme);
    } catch (_) {}
    if (!dashboardView.classList.contains("hidden")) renderAll();
  }

  function initTheme() {
    let saved = "";
    try {
      saved = localStorage.getItem(LS_THEME) || "";
    } catch (_) {}
    applyTheme(saved || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  }

  // ===== CSV Parser =====
  function parseCSV(text) {
    const clean = text.replace(/^\uFEFF/, "");
    const first = clean.split(/\r?\n/)[0] || "";
    const delim = (first.split(";").length > first.split(",").length) ? ";" : ",";
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

  function parseIdList(val) {
    if (Array.isArray(val)) return val.map((x) => String(x).trim()).filter(Boolean);
    const s = String(val || "").trim();
    if (!s) return [];
    if (s.startsWith("[")) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) return arr.map((x) => String(x).trim()).filter(Boolean);
      } catch (_) {}
    }
    return s.split(/[,;|\s]+/).map((x) => x.replace(/[\[\]"']/g, "").trim()).filter(Boolean);
  }

  function parseFlexibleDate(val) {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    const s = String(val).trim();
    const d1 = new Date(s);
    if (!isNaN(d1.getTime())) return d1;
    // Formato DD/MM/AAAA HH:mm(:ss)
    const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
      const yr = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
      return new Date(yr, Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
    }
    return null;
  }

  function normalizeResults(rawArr) {
    const cleanKey = (k) =>
      String(k || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

    const pick = (o, keys) => {
      for (const k of keys) {
        if (k in o && o[k] != null && String(o[k]).trim() !== "") return o[k];
      }
      return "";
    };
    return (rawArr || [])
      .map((r) => {
        const o = {};
        Object.keys(r || {}).forEach((k) => {
          o[k.toLowerCase().trim()] = r[k];
          o[cleanKey(k)] = r[k];
        });
        const nombre = String(pick(o, ["nombre", "empleado", "usuario", "recepcionista", "name", "nombre_y_apellidos"])).trim();
        const dto = String(pick(o, ["dto", "departamento", "hotel"])).trim() || "Todos";
        const modulo = String(pick(o, ["modulo", "módulo", "categoria", "categoría"])).trim() || "General";
        const nivel = String(pick(o, ["nivel", "level"])).trim() || "Todos";
        const total = Number(pick(o, ["total", "preguntas", "total_preguntas"])) || 0;
        let aciertos = Number(pick(o, ["aciertos", "ok", "correctas"])) || 0;
        let fallos = Number(pick(o, ["fallos", "ko", "errores", "num_fallos"])) || Math.max(0, total - aciertos);
        const pctRaw = pick(o, ["pct", "porcentaje", "nota", "score", "acierto", "porcentaje_acierto"]);
        let pct;
        if (pctRaw !== "") {
          let pNum = Number(String(pctRaw).replace("%", "").replace(",", "."));
          if (pNum > 0 && pNum <= 1 && !String(pctRaw).includes("%")) pNum = pNum * 100;
          pct = Math.round(pNum);
        } else if ((total === 0 || aciertos > total) && aciertos > 0 && aciertos <= 100) {
          // Si la columna traía el porcentaje (ej. 90 con total=0 o 90 sobre 30)
          pct = Math.round(aciertos);
          aciertos = total > 0 ? Math.round((pct / 100) * total) : 0;
          fallos = total > 0 ? Math.max(0, total - aciertos) : 0;
        } else {
          pct = total ? Math.round((aciertos / total) * 100) : 0;
        }
        if (total > 0 && aciertos > total) {
          aciertos = Math.round((Math.min(100, Math.max(0, pct)) / 100) * total);
          fallos = Math.max(0, total - aciertos);
        }
        pct = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
        const dur = Number(pick(o, ["duracion_seg", "duración_seg", "duracion", "tiempo", "segundos"])) || 0;
        const date = parseFlexibleDate(pick(o, ["fecha", "timestamp", "date", "marca_temporal", "marca temporal", "created_at", "fecha_hora"]));

        let rawFallos = pick(o, [
          "detalle_fallos",
          "detalle_de_fallos",
          "fallos_detalle",
          "falladas",
          "preguntas_falladas",
          "ids_fallos",
          "ids_falladas",
          "id_fallos",
          "fallos_ids",
          "errores_ids",
          "detalle_errores",
        ]);
        if (!rawFallos) {
          const fallbackKey = Object.keys(o).find(
            (k) => (k.includes("fall") || k.includes("error")) && (k.includes("detall") || k.includes("id") || k.includes("preg"))
          );
          if (fallbackKey) rawFallos = o[fallbackKey];
        }
        const detalle_fallos = parseIdList(rawFallos);
        return { nombre, dto, modulo, nivel, total, aciertos, fallos, pct, duracion_seg: dur, date, detalle_fallos };
      })
      .filter((r) => r.nombre || r.total > 0)
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  }

  // ===== Data Fetching =====
  function getConfiguredResultsCsvUrl() {
    try {
      const saved = (localStorage.getItem(LS_RESULTS_CSV) || "").trim();
      if (saved) return saved;
    } catch (_) {}
    return (CFG.RESULTS_CSV_URL || "").trim();
  }

  function setBanner(type, htmlMsg) {
    sourceBanner.classList.remove("is-ok", "is-warn");
    if (type === "ok") sourceBanner.classList.add("is-ok");
    if (type === "warn") sourceBanner.classList.add("is-warn");
    sourceBannerText.innerHTML = htmlMsg;
  }

  async function loadQuestionsIndex() {
    try {
      const res = await window.DataLoader.loadQuestions();
      ALL_QUESTIONS = res.questions || [];
      QUESTIONS_BY_ID = new Map();
      ALL_QUESTIONS.forEach((q) => QUESTIONS_BY_ID.set(String(q.id), q));
      tabBankBadge.textContent = ALL_QUESTIONS.length;
      const mods = [...new Set(ALL_QUESTIONS.map((q) => q.mod).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
      qbMod.innerHTML = '<option value="">Todos</option>' + mods.map((m) => `<option>${esc(m)}</option>`).join("");
      renderQuestionBank();
    } catch (_) {}
  }

  function formatHotelLabel(hotelId) {
    const h = String(hotelId || "").trim().toLowerCase();
    if (!h) return "General";
    if (h.includes("guadiana")) return "Sercotel Guadiana";
    if (h.includes("cumbria")) return "Cumbria Spa&Hotel";
    return String(hotelId).trim();
  }

  async function loadTurnosStaffForAdmin() {
    const url = (CFG.TURNOS_SUPABASE_URL || "").replace(/\/+$/, "");
    const key = (CFG.TURNOS_SUPABASE_ANON_KEY || "").trim();
    if (!url || !key) return;
    try {
      const res = await fetch(
        `${url}/rest/v1/empleados?select=id,nombre,hotel_id,activo,estado_empresa,fecha_baja,orden&order=orden.asc,nombre.asc`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" }
      );
      if (!res.ok) return;
      const rows = await res.json();
      const todayIso = new Date().toISOString().slice(0, 10);
      const seen = new Set();
      TURNOS_STAFF = (Array.isArray(rows) ? rows : [])
        .filter((e) => {
          const name = String(e.nombre || "").trim();
          if (!name || /^(vacante|libre)\b/i.test(name)) return false;
          if (e.activo === false) return false;
          const st = String(e.estado_empresa || "").trim().toLowerCase();
          if (st && (st.includes("baja") || st.includes("inactiv") || st.includes("cese") || st.includes("elimin"))) return false;
          if (e.fecha_baja && String(e.fecha_baja).slice(0, 10) <= todayIso) return false;
          const k = canonPersonKey(name);
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .map((e) => ({
          name: String(e.nombre).trim(),
          key: canonPersonKey(e.nombre),
          hotel: formatHotelLabel(e.hotel_id),
        }));

      const hotels = [...new Set(TURNOS_STAFF.map((s) => s.hotel))].sort((a, b) => a.localeCompare(b, "es"));
      compHotelFilter.innerHTML = '<option value="">Todos los hoteles</option>' + hotels.map((h) => `<option>${esc(h)}</option>`).join("");
      renderCompliance();
    } catch (_) {}
  }

  async function loadResultsFromRemote() {
    setBanner("info", '<i class="fas fa-spinner fa-spin"></i> Cargando resultados desde Google Sheets…');

    // 1) Si hay URL CSV de resultados configurada (funciona tanto en web como en local file://)
    const csvUrl = getConfiguredResultsCsvUrl();
    if (csvUrl) {
      try {
        const sep = csvUrl.includes("?") ? "&" : "?";
        const res = await fetch(`${csvUrl}${sep}_ts=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        ALL_RESULTS = normalizeResults(parseCSV(text));
        populateFilterOptions();
        renderAll();
        setBanner("ok", `<i class="fas fa-check-circle"></i> <b>Conectado en vivo a Google Sheets (CSV)</b> · ${ALL_RESULTS.length} sesiones cargadas.`);
        return;
      } catch (e) {
        setBanner("warn", `<i class="fas fa-exclamation-circle"></i> No se pudo leer el CSV remoto (${esc(e.message)}). Puedes importar un CSV o revisar el enlace en <i class="fas fa-database"></i>.`);
        return;
      }
    }

    // 2) Intentar leer JSON via doGet() del mismo RESULTS_ENDPOINT de Apps Script
    const endpoint = CFG.RESULTS_ENDPOINT;
    if (endpoint) {
      try {
        const sep = endpoint.includes("?") ? "&" : "?";
        const res = await fetch(`${endpoint}${sep}action=get_results&_ts=${Date.now()}`, { cache: "no-store" });
        const txt = await res.text();
        const json = JSON.parse(txt);
        const arr = Array.isArray(json) ? json : json.results || json.data || json.rows || [];
        ALL_RESULTS = normalizeResults(arr);
        populateFilterOptions();
        renderAll();
        setBanner("ok", `<i class="fas fa-check-circle"></i> <b>Conectado en vivo al Apps Script</b> · ${ALL_RESULTS.length} sesiones cargadas.`);
        return;
      } catch (_) {
        // Apps Script todavía no tiene doGet() habilitado
      }
    }

    // 3) Si todavía no está conectado el lector, orientar claramente al admin
    ALL_RESULTS = [];
    populateFilterOptions();
    renderAll();
    setBanner(
      "warn",
      `<i class="fas fa-info-circle"></i> <b>Falta conectar la lectura de tu Google Sheet:</b> pulsa el botón <i class="fas fa-database"></i> arriba para pegar la URL CSV de <i>Formación – Resultados</i> (o añade <code>doGet()</code> desde <code>docs/apps_script_resultados.gs</code>). También puedes <b>Importar CSV</b> o probar con <b>Datos de prueba</b>.`
    );
  }

  function loadDemoData() {
    const names = ["Laura García", "Carlos Méndez", "Elena Ruiz", "Javier López", "Sofía Navarro", "Natalio Gómez"];
    const dtos = ["Recepción", "Recep-Guadiana", "Recep-Cumbria"];
    const mods = [
      "Operativa Turnos",
      "Atención al Cliente y Protocolo",
      "Gestión Administrativa y Cobros",
      "Reservas",
      "Errores Comunes",
      "Supervisión de Ocupación (Inventory)",
    ];
    const qIds = [...QUESTIONS_BY_ID.keys()];
    const hotWrongIds = qIds.slice(0, 8);
    const now = Date.now();
    const demo = [];

    for (let i = 0; i < 24; i++) {
      const total = i % 3 === 0 ? 10 : 30;
      const pct = Math.min(100, Math.max(43, Math.round(62 + Math.random() * 38)));
      const aciertos = Math.round((pct / 100) * total);
      const fallos = total - aciertos;
      const wrongList = [];
      for (let f = 0; f < Math.min(fallos, 6); f++) {
        const pickPool = f < 3 && hotWrongIds.length ? hotWrongIds : qIds;
        if (pickPool.length) wrongList.push(pickPool[Math.floor(Math.random() * pickPool.length)]);
      }
      demo.push({
        nombre: names[i % names.length],
        dto: dtos[i % dtos.length],
        modulo: mods[i % mods.length],
        nivel: ["Básico", "Intermedio", "Avanzado"][i % 3],
        total,
        aciertos,
        fallos,
        pct,
        duracion_seg: 160 + Math.round(Math.random() * 480),
        date: new Date(now - i * 36 * 3600 * 1000),
        detalle_fallos: wrongList,
      });
    }

    ALL_RESULTS = demo;
    populateFilterOptions();
    renderAll();
    setBanner("warn", '<i class="fas fa-flask"></i> <b>Mostrando datos de prueba (24 sesiones simuladas).</b> Conecta tu Google Sheet en <i class="fas fa-database"></i> para ver los resultados reales.');
  }

  // ===== Reglas de participantes (normalización, combinación y exclusión) =====
  function canonPersonKey(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function toTitleCase(name) {
    return String(name || "")
      .trim()
      .replace(/\s+/g, " ")
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ""))
      .join(" ");
  }

  function loadPeopleRules() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LS_PEOPLE_RULES) || "{}");
      return {
        aliases: parsed && typeof parsed.aliases === "object" && parsed.aliases ? parsed.aliases : {},
        excluded: Array.isArray(parsed?.excluded) ? parsed.excluded : [],
        excludedLabels: parsed && typeof parsed.excludedLabels === "object" && parsed.excludedLabels ? parsed.excludedLabels : {},
      };
    } catch (_) {
      return { aliases: {}, excluded: [], excludedLabels: {} };
    }
  }

  function savePeopleRules(rules) {
    try {
      localStorage.setItem(LS_PEOPLE_RULES, JSON.stringify(rules));
    } catch (_) {}
  }

  function resolvePerson(rawName, rules) {
    let key = canonPersonKey(rawName || "Sin nombre");
    let display = toTitleCase(rawName || "Sin nombre");
    const visited = new Set();
    while (rules.aliases[key] && !visited.has(key)) {
      visited.add(key);
      display = rules.aliases[key];
      key = canonPersonKey(display);
    }
    const isExcluded = rules.excluded.includes(key);
    return { key, display, isExcluded };
  }

  function updateRulesBadge() {
    const rules = loadPeopleRules();
    const n = Object.keys(rules.aliases).length + rules.excluded.length;
    if (n > 0) {
      btnManageRules.textContent = `${n} ${n === 1 ? "regla activa" : "reglas activas"} · Gestionar`;
      btnManageRules.classList.remove("hidden");
    } else {
      btnManageRules.classList.add("hidden");
    }
  }

  function openMergeModal(sourceKey, sourceDisplay, allPeople) {
    mergeSourceKey = sourceKey;
    mergeSourceDisplay = sourceDisplay;
    mergeSourceLabel.textContent = sourceDisplay;
    const targets = allPeople.filter((p) => p.key !== sourceKey).sort((a, b) => a.name.localeCompare(b.name, "es"));
    mergeTargetSelect.innerHTML = targets.map((p) => `<option value="${esc(p.name)}">${esc(p.name)} (${p.sessions} ses.)</option>`).join("");
    btnConfirmMerge.disabled = targets.length === 0;
    mergeModal.classList.remove("hidden");
  }

  function openRulesModal() {
    const rules = loadPeopleRules();
    const items = [];
    Object.entries(rules.aliases).forEach(([srcKey, targetName]) => {
      items.push(`
        <div class="rule-row">
          <span><i class="fas fa-compress-arrows-alt" style="color:var(--accent-blue)"></i> <b>${esc(toTitleCase(srcKey))}</b> → <b>${esc(targetName)}</b></span>
          <button type="button" class="link-btn" data-unmerge="${esc(srcKey)}">Deshacer</button>
        </div>`);
    });
    rules.excluded.forEach((exKey) => {
      const lbl = rules.excludedLabels[exKey] || toTitleCase(exKey);
      items.push(`
        <div class="rule-row">
          <span><i class="fas fa-eye-slash" style="color:var(--accent-red)"></i> Oculto: <b>${esc(lbl)}</b></span>
          <button type="button" class="link-btn" data-restore="${esc(exKey)}">Restaurar</button>
        </div>`);
    });

    rulesListBox.innerHTML = items.length ? items.join("") : '<div class="empty-state">No hay reglas activas.</div>';

    rulesListBox.querySelectorAll("[data-unmerge]").forEach((btn) => {
      btn.onclick = () => {
        const r = loadPeopleRules();
        delete r.aliases[btn.dataset.unmerge];
        savePeopleRules(r);
        openRulesModal();
        renderAll();
      };
    });
    rulesListBox.querySelectorAll("[data-restore]").forEach((btn) => {
      btn.onclick = () => {
        const r = loadPeopleRules();
        r.excluded = r.excluded.filter((k) => k !== btn.dataset.restore);
        delete r.excludedLabels[btn.dataset.restore];
        savePeopleRules(r);
        openRulesModal();
        renderAll();
      };
    });

    rulesModal.classList.remove("hidden");
  }

  // ===== Filters =====
  function populateFilterOptions() {
    const depts = [...new Set(ALL_RESULTS.map((r) => r.dto).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
    const mods = [...new Set(ALL_RESULTS.map((r) => r.modulo).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
    fDept.innerHTML = '<option value="">Todos</option>' + depts.map((d) => `<option>${esc(d)}</option>`).join("");
    fMod.innerHTML = '<option value="">Todos</option>' + mods.map((m) => `<option>${esc(m)}</option>`).join("");
  }

  function getFilteredResults() {
    const q = fSearch.value.trim().toLowerCase();
    const d = fDept.value;
    const m = fMod.value;
    const days = fRange.value === "all" ? null : Number(fRange.value);
    const cutoff = days ? Date.now() - days * 86400 * 1000 : null;
    const rules = loadPeopleRules();

    const out = [];
    for (const r of ALL_RESULTS) {
      const person = resolvePerson(r.nombre, rules);
      if (person.isExcluded) continue;
      if (q && !person.display.toLowerCase().includes(q) && !r.nombre.toLowerCase().includes(q)) continue;
      if (d && r.dto !== d) continue;
      if (m && r.modulo !== m) continue;
      if (cutoff && r.date && r.date.getTime() < cutoff) continue;
      out.push({ ...r, nombre: person.display, personKey: person.key });
    }
    return out;
  }

  // ===== Render Dashboard =====
  function badgeClass(pct) {
    return pct >= 90 ? "ok" : pct >= 60 ? "warn" : "ko";
  }

  function renderAll() {
    const list = getFilteredResults();

    // KPIs
    kpiSessions.textContent = list.length;
    if (list.length) {
      const avg = Math.round(list.reduce((s, r) => s + r.pct, 0) / list.length);
      const exc = Math.round((list.filter((r) => r.pct >= 90).length / list.length) * 100);
      const people = new Set(list.map((r) => r.nombre.toLowerCase()).filter(Boolean)).size;
      const avgTime = Math.round(list.reduce((s, r) => s + (r.duracion_seg || 0), 0) / list.length);
      kpiAvg.textContent = `${avg}%`;
      kpiExcellence.textContent = `${exc}%`;
      kpiPeople.textContent = people;
      kpiTime.textContent = formatTime(avgTime);
    } else {
      kpiAvg.textContent = "—";
      kpiExcellence.textContent = "—";
      kpiPeople.textContent = "0";
      kpiTime.textContent = "—";
    }

    renderCharts(list);
    renderTrendChart(list);
    renderPeopleTable(list);
    renderMissedQuestions(list);
    renderSessionsTable(list);
    renderCompliance();
  }

  function renderTrendChart(list) {
    const isDark = document.body.classList.contains("dark-mode");
    const textColor = isDark ? "#cbd5e1" : "#334155";
    const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)";

    const byMonth = new Map();
    list.forEach((r) => {
      if (!r.date) return;
      const ym = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth.has(ym)) byMonth.set(ym, { sum: 0, n: 0 });
      const e = byMonth.get(ym);
      e.sum += r.pct;
      e.n++;
    });

    const entries = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const labels = entries.map(([ym]) => {
      const [y, m] = ym.split("-");
      return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("es-ES", { month: "short", year: "2-digit" });
    });

    if (chartTrend) chartTrend.destroy();
    chartTrend = new Chart($("#chartTrend"), {
      data: {
        labels,
        datasets: [
          {
            type: "line",
            label: "Nota media (%)",
            data: entries.map(([, v]) => Math.round(v.sum / v.n)),
            borderColor: "#0a6aa1",
            backgroundColor: "rgba(10, 106, 161, 0.14)",
            tension: 0.3,
            fill: true,
            yAxisID: "y",
          },
          {
            type: "bar",
            label: "Sesiones",
            data: entries.map(([, v]) => v.n),
            backgroundColor: "rgba(165, 140, 95, 0.55)",
            borderRadius: 6,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor } } },
        scales: {
          x: { ticks: { color: textColor }, grid: { display: false } },
          y: { min: 0, max: 100, position: "left", ticks: { color: textColor }, grid: { color: gridColor } },
          y1: { min: 0, position: "right", ticks: { color: textColor, precision: 0 }, grid: { display: false } },
        },
      },
    });
  }

  function openPersonModal(personName, personKey) {
    const rules = loadPeopleRules();
    const sessions = ALL_RESULTS.map((r) => {
      const p = resolvePerson(r.nombre, rules);
      return { ...r, nombre: p.display, personKey: p.key };
    }).filter((r) => r.personKey === personKey);

    personModalTitle.innerHTML = `<i class="fas fa-user-circle" style="color:var(--accent-blue)"></i> ${esc(personName)}`;

    if (!sessions.length) {
      personModalBody.innerHTML = '<div class="empty-state">Este recepcionista aún no tiene sesiones registradas.</div>';
      personModal.classList.remove("hidden");
      return;
    }

    const avg = Math.round(sessions.reduce((s, x) => s + x.pct, 0) / sessions.length);
    const best = Math.max(...sessions.map((x) => x.pct));
    const modMap = new Map();
    sessions.forEach((s) => {
      const m = s.modulo || "General";
      if (!modMap.has(m)) modMap.set(m, { sum: 0, n: 0 });
      const e = modMap.get(m);
      e.sum += s.pct;
      e.n++;
    });

    const modHtml = [...modMap.entries()]
      .map(([m, v]) => {
        const ma = Math.round(v.sum / v.n);
        return `<div class="rule-row"><span>${esc(m)} (${v.n} ses.)</span><span class="score-badge ${badgeClass(ma)}">${ma}%</span></div>`;
      })
      .join("");

    const histHtml = sessions
      .slice(0, 12)
      .map(
        (s) => `
        <tr>
          <td style="font-size:12px;color:var(--text-muted)">${esc(formatDate(s.date))}</td>
          <td>${esc(s.modulo)}</td>
          <td>${s.aciertos}/${s.total}</td>
          <td><span class="score-badge ${badgeClass(s.pct)}">${s.pct}%</span></td>
        </tr>`
      )
      .join("");

    personModalBody.innerHTML = `
      <div class="summary-kpis" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px">
        <div class="stat-tile"><strong>${sessions.length}</strong><span>Sesiones</span></div>
        <div class="stat-tile ok"><strong>${avg}%</strong><span>Media</span></div>
        <div class="stat-tile"><strong>${best}%</strong><span>Mejor nota</span></div>
      </div>
      <div class="field-label" style="margin-bottom:6px">Rendimiento por módulo</div>
      <div class="rules-list" style="margin-bottom:14px;max-height:150px">${modHtml}</div>
      <div class="field-label" style="margin-bottom:6px">Últimas sesiones</div>
      <div class="table-wrap" style="max-height:200px;overflow-y:auto">
        <table class="data-table">
          <thead><tr><th>Fecha</th><th>Módulo</th><th>Aciertos</th><th>Nota</th></tr></thead>
          <tbody>${histHtml}</tbody>
        </table>
      </div>`;
    personModal.classList.remove("hidden");
  }

  function renderCompliance() {
    if (!TURNOS_STAFF.length) {
      complianceTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Cargando plantilla desde Turnos-new…</td></tr>';
      return;
    }

    const rules = loadPeopleRules();
    const resolvedSessions = ALL_RESULTS.map((r) => {
      const p = resolvePerson(r.nombre, rules);
      return { ...r, nombre: p.display, personKey: p.key, isExcluded: p.isExcluded };
    }).filter((r) => !r.isExcluded);

    const byKey = new Map();
    resolvedSessions.forEach((r) => {
      if (!byKey.has(r.personKey)) byKey.set(r.personKey, { sessions: 0, sum: 0, last: null });
      const e = byKey.get(r.personKey);
      e.sessions++;
      e.sum += r.pct;
      if (r.date && (!e.last || r.date > e.last)) e.last = r.date;
    });

    const hotelFilter = compHotelFilter.value;
    const cutoff30 = Date.now() - 30 * 86400 * 1000;

    const rows = TURNOS_STAFF.filter((s) => !hotelFilter || s.hotel === hotelFilter).map((s) => {
      const st = byKey.get(s.key) || { sessions: 0, sum: 0, last: null };
      const avg = st.sessions ? Math.round(st.sum / st.sessions) : null;
      let status = "never";
      if (st.sessions > 0) status = st.last && st.last.getTime() >= cutoff30 ? "ok" : "stale";
      return { ...s, sessions: st.sessions, avg, last: st.last, status };
    });

    const nOk = rows.filter((r) => r.status === "ok").length;
    const nStale = rows.filter((r) => r.status === "stale").length;
    const nNever = rows.filter((r) => r.status === "never").length;

    compTotal.textContent = rows.length;
    compUpToDate.textContent = nOk;
    compStale.textContent = nStale;
    compNever.textContent = nNever;
    tabPendingBadge.textContent = nStale + nNever;

    const order = { never: 0, stale: 1, ok: 2 };
    rows.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name, "es"));

    complianceTableBody.innerHTML = rows
      .map((r) => {
        const statusBadge =
          r.status === "ok"
            ? '<span class="score-badge ok">Al día</span>'
            : r.status === "stale"
            ? '<span class="score-badge warn">&gt;30 días</span>'
            : '<span class="score-badge ko">Sin iniciar</span>';
        return `
          <tr>
            <td><button type="button" class="person-link" data-person-key="${esc(r.key)}" data-person-name="${esc(r.name)}">${esc(r.name)}</button></td>
            <td>${esc(r.hotel)}</td>
            <td>${statusBadge}</td>
            <td>${r.sessions}</td>
            <td>${r.avg !== null ? `<span class="score-badge ${badgeClass(r.avg)}">${r.avg}%</span>` : "—"}</td>
            <td style="color:var(--text-muted);font-size:12.5px">${r.last ? esc(r.last.toLocaleDateString("es-ES")) : "Nunca"}</td>
          </tr>`;
      })
      .join("");

    complianceTableBody.querySelectorAll("[data-person-key]").forEach((btn) => {
      btn.onclick = () => openPersonModal(btn.dataset.personName, btn.dataset.personKey);
    });

    btnCopyReminder.onclick = () => {
      const pending = rows.filter((r) => r.status !== "ok").map((r) => `• ${r.name} (${r.hotel})`);
      const msg = pending.length
        ? `📋 Recordatorio · Formación Recepción (Guadiana & Cumbria)\n\nCompañeros pendientes de completar una sesión este mes:\n${pending.join("\n")}\n\n🔗 Acceso: https://nataliogc.github.io/Form.Recep/`
        : "✅ ¡Todo el equipo está al día con la formación de este mes!";
      navigator.clipboard?.writeText(msg).then(() => {
        const old = btnCopyReminder.innerHTML;
        btnCopyReminder.innerHTML = '<i class="fas fa-check"></i> ¡Copiado al portapapeles!';
        setTimeout(() => (btnCopyReminder.innerHTML = old), 2200);
      });
    };
  }

  function renderQuestionBank() {
    const q = (qbSearch.value || "").trim().toLowerCase();
    const m = qbMod.value || "";
    const lv = qbLevel.value || "";

    const filtered = ALL_QUESTIONS.filter((item) => {
      if (m && item.mod !== m) return false;
      if (lv && item.nivel !== lv) return false;
      if (q) {
        const blob = [item.id, item.text, item.A, item.B, item.C, item.D, item.why, item.mod].join(" ").toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    qbCountTag.textContent = `${filtered.length} preguntas`;
    if (!filtered.length) {
      qbankList.innerHTML = '<div class="empty-state">No hay preguntas que coincidan con el filtro.</div>';
      return;
    }

    qbankList.innerHTML = filtered
      .slice(0, 80)
      .map(
        (item) => `
        <div class="qbank-item">
          <div class="qbank-meta">
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <span class="tag">#${esc(item.id)}</span>
              ${item.dto ? `<span class="tag">${esc(item.dto)}</span>` : ""}
              ${item.mod ? `<span class="tag">${esc(item.mod)}</span>` : ""}
              ${item.nivel ? `<span class="tag">${esc(item.nivel)}</span>` : ""}
            </div>
            <span class="score-badge ok">Correcta: ${esc(item.correct)}</span>
          </div>
          <h4>${esc(item.text)}</h4>
          <div class="qbank-opts">
            ${["A", "B", "C", "D"]
              .filter((L) => item[L])
              .map((L) => `<div class="${L === item.correct ? "is-corr" : ""}"><b>${L}.</b> ${esc(item[L])}</div>`)
              .join("")}
          </div>
          ${item.why ? `<p class="qbank-why"><i class="fas fa-info-circle"></i> ${esc(item.why)}</p>` : ""}
        </div>`
      )
      .join("");
  }

  function renderCharts(list) {
    const isDark = document.body.classList.contains("dark-mode");
    const textColor = isDark ? "#cbd5e1" : "#334155";
    const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)";

    // 1) Nota media por módulo
    const modMap = new Map();
    list.forEach((r) => {
      const k = r.modulo || "General";
      if (!modMap.has(k)) modMap.set(k, { sum: 0, n: 0 });
      const e = modMap.get(k);
      e.sum += r.pct;
      e.n++;
    });
    const modEntries = [...modMap.entries()]
      .map(([name, v]) => ({ name, avg: Math.round(v.sum / v.n), n: v.n }))
      .sort((a, b) => a.avg - b.avg);

    if (chartModules) chartModules.destroy();
    chartModules = new Chart($("#chartModules"), {
      type: "bar",
      data: {
        labels: modEntries.map((x) => `${x.name} (${x.n})`),
        datasets: [
          {
            label: "Nota media (%)",
            data: modEntries.map((x) => x.avg),
            backgroundColor: modEntries.map((x) => (x.avg >= 90 ? "#27ae60" : x.avg >= 60 ? "#0a6aa1" : "#b22222")),
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { min: 0, max: 100, ticks: { color: textColor }, grid: { color: gridColor } },
          y: { ticks: { color: textColor }, grid: { display: false } },
        },
      },
    });

    // 2) Distribución
    const cOk = list.filter((r) => r.pct >= 90).length;
    const cWarn = list.filter((r) => r.pct >= 60 && r.pct < 90).length;
    const cKo = list.filter((r) => r.pct < 60).length;

    if (chartDist) chartDist.destroy();
    chartDist = new Chart($("#chartDist"), {
      type: "doughnut",
      data: {
        labels: ["Excelente (≥90%)", "Mejorable (60–89%)", "Repasar (<60%)"],
        datasets: [
          {
            data: [cOk, cWarn, cKo],
            backgroundColor: ["#27ae60", "#d97706", "#b22222"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: { position: "bottom", labels: { color: textColor, padding: 14 } },
        },
      },
    });
  }

  function renderPeopleTable(list) {
    updateRulesBadge();
    const map = new Map();
    list.forEach((r) => {
      const key = r.personKey || canonPersonKey(r.nombre || "Sin nombre");
      if (!map.has(key)) map.set(key, { key, name: r.nombre || "Sin nombre", sessions: 0, sum: 0, best: 0, last: null });
      const p = map.get(key);
      p.sessions++;
      p.sum += r.pct;
      if (r.pct > p.best) p.best = r.pct;
      if (r.date && (!p.last || r.date > p.last)) p.last = r.date;
    });

    const rows = [...map.values()]
      .map((p) => ({ ...p, avg: Math.round(p.sum / p.sessions) }))
      .sort((a, b) => b.avg - a.avg || b.sessions - a.sessions);

    peopleCountTag.textContent = `${rows.length} personas`;
    if (!rows.length) {
      peopleTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">Sin datos para este filtro.</td></tr>';
      return;
    }

    peopleTableBody.innerHTML = rows
      .map(
        (p) => `
        <tr>
          <td><button type="button" class="person-link" data-open-person="${esc(p.key)}" data-open-name="${esc(p.name)}">${esc(p.name)}</button></td>
          <td>${p.sessions}</td>
          <td><span class="score-badge ${badgeClass(p.avg)}">${p.avg}%</span></td>
          <td>${p.best}%</td>
          <td style="color:var(--text-muted);font-size:12.5px">${p.last ? esc(p.last.toLocaleDateString("es-ES")) : "—"}</td>
          <td style="text-align:right">
            <div class="row-actions">
              <button type="button" class="mini-action" data-merge-key="${esc(p.key)}" data-merge-name="${esc(p.name)}" title="Combinar con otro participante">
                <i class="fas fa-compress-arrows-alt"></i>
              </button>
              <button type="button" class="mini-action danger" data-hide-key="${esc(p.key)}" data-hide-name="${esc(p.name)}" title="Ocultar / eliminar del análisis">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        </tr>`
      )
      .join("");

    peopleTableBody.querySelectorAll("[data-open-person]").forEach((btn) => {
      btn.onclick = () => openPersonModal(btn.dataset.openName, btn.dataset.openPerson);
    });

    peopleTableBody.querySelectorAll("[data-merge-key]").forEach((btn) => {
      btn.onclick = () => openMergeModal(btn.dataset.mergeKey, btn.dataset.mergeName, rows);
    });

    peopleTableBody.querySelectorAll("[data-hide-key]").forEach((btn) => {
      btn.onclick = () => {
        const key = btn.dataset.hideKey;
        const name = btn.dataset.hideName;
        if (!confirm(`¿Ocultar a "${name}" del panel y de las estadísticas? (Podrás restaurarlo cuando quieras desde "Gestionar").`)) return;
        const rules = loadPeopleRules();
        if (!rules.excluded.includes(key)) rules.excluded.push(key);
        rules.excludedLabels[key] = name;
        savePeopleRules(rules);
        renderAll();
      };
    });
  }

  function renderMissedQuestions(list) {
    const counts = new Map();
    list.forEach((r) => {
      (r.detalle_fallos || []).forEach((id) => {
        counts.set(id, (counts.get(id) || 0) + 1);
      });
    });

    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (!top.length) {
      missedQuestionsList.innerHTML =
        '<div class="empty-state"><i class="fas fa-check-circle" style="color:var(--accent-green)"></i> Sin fallos registrados en este filtro.</div>';
      return;
    }

    missedQuestionsList.innerHTML = top
      .map(([id, n]) => {
        const q = QUESTIONS_BY_ID.get(String(id));
        const qText = q ? q.text : `Pregunta #${id}`;
        const qMod = q ? `${q.mod || "General"}${q.nivel ? " · " + q.nivel : ""}` : "Sin detalle en banco";
        const corrTxt = q && q.correct ? `Correcta (${q.correct}): ${q[q.correct] || ""}` : "";
        return `
          <div class="missed-item">
            <div class="missed-head">
              <span class="tag">${esc(qMod)}</span>
              <span class="missed-count">${n} ${n === 1 ? "fallo" : "fallos"}</span>
            </div>
            <p class="missed-q">#${esc(id)} · ${esc(qText)}</p>
            ${corrTxt ? `<p class="missed-ans"><i class="fas fa-check" style="color:var(--accent-green)"></i> ${esc(corrTxt)}</p>` : ""}
          </div>`;
      })
      .join("");
  }

  function renderSessionsTable(list) {
    const scoreFilter = histScoreFilter ? histScoreFilter.value : "";
    const filtered = list.filter((r) => {
      if (scoreFilter === "ok") return r.pct >= 90;
      if (scoreFilter === "warn") return r.pct >= 60 && r.pct < 90;
      if (scoreFilter === "ko") return r.pct < 60;
      return true;
    });

    const pageSize = Number(histPageSize?.value) || 10;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (histPage > totalPages) histPage = totalPages;
    if (histPage < 1) histPage = 1;

    const start = (histPage - 1) * pageSize;
    const pageRows = filtered.slice(start, start + pageSize);

    rowsCountTag.textContent = `${filtered.length} registros`;
    if (histPager) {
      histPager.classList.toggle("hidden", filtered.length <= pageSize);
      histPageInfo.textContent = `Página ${histPage} / ${totalPages}`;
      btnHistPrev.disabled = histPage <= 1;
      btnHistNext.disabled = histPage >= totalPages;
    }

    if (!pageRows.length) {
      sessionsTableBody.innerHTML = '<tr><td colspan="8" class="empty-state">No hay sesiones registradas para mostrar.</td></tr>';
      return;
    }

    sessionsTableBody.innerHTML = pageRows
      .map(
        (r) => `
        <tr>
          <td style="white-space:nowrap;font-size:12.5px;color:var(--text-muted)">${esc(formatDate(r.date))}</td>
          <td><strong>${esc(r.nombre || "—")}</strong></td>
          <td>${esc(r.dto)}</td>
          <td>${esc(r.modulo)}</td>
          <td>${esc(r.nivel)}</td>
          <td>${r.total > 0 ? `${r.aciertos}/${r.total}` : "—"}</td>
          <td><span class="score-badge ${badgeClass(r.pct)}">${r.pct}%</span></td>
          <td>${formatTime(r.duracion_seg)}</td>
        </tr>`
      )
      .join("");
  }

  function exportFilteredCsv() {
    const list = getFilteredResults();
    if (!list.length) return;
    const header = ["Fecha", "Recepcionista", "DTO", "Modulo", "Nivel", "Aciertos", "Fallos", "Total", "Nota_%", "Duracion_seg"];
    const lines = [header.join(",")].concat(
      list.map((r) =>
        [
          r.date ? r.date.toISOString() : "",
          r.nombre,
          r.dto,
          r.modulo,
          r.nivel,
          r.aciertos,
          r.fallos,
          r.total,
          r.pct,
          r.duracion_seg,
        ]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
    );
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `resultados_formacion_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  // ===== Auth =====
  function enterDashboard() {
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    btnLogout.classList.remove("hidden");
    btnSourceModal.classList.remove("hidden");
    Promise.all([loadQuestionsIndex(), loadTurnosStaffForAdmin()]).then(loadResultsFromRemote);
  }

  loginForm.onsubmit = (e) => {
    e.preventDefault();
    const expected = CFG.ADMIN_PASSWORD || "guadiana2026";
    if (passInput.value.trim() === expected) {
      loginError.classList.add("hidden");
      try {
        sessionStorage.setItem(SS_AUTH, "1");
      } catch (_) {}
      enterDashboard();
    } else {
      loginError.classList.remove("hidden");
      passInput.select();
    }
  };

  btnLogout.onclick = () => {
    try {
      sessionStorage.removeItem(SS_AUTH);
    } catch (_) {}
    location.reload();
  };

  // ===== Events =====
  btnTheme.onclick = () => applyTheme(document.body.classList.contains("dark-mode") ? "light" : "dark");
  [fSearch, fDept, fMod, fRange].forEach(
    (el) =>
      (el.oninput = el.onchange = () => {
        histPage = 1;
        renderAll();
      })
  );
  if (histScoreFilter) {
    histScoreFilter.onchange = () => {
      histPage = 1;
      renderSessionsTable(getFilteredResults());
    };
  }
  if (histPageSize) {
    histPageSize.onchange = () => {
      histPage = 1;
      renderSessionsTable(getFilteredResults());
    };
  }
  if (btnHistPrev) {
    btnHistPrev.onclick = () => {
      if (histPage > 1) {
        histPage--;
        renderSessionsTable(getFilteredResults());
      }
    };
  }
  if (btnHistNext) {
    btnHistNext.onclick = () => {
      histPage++;
      renderSessionsTable(getFilteredResults());
    };
  }
  btnRefreshResults.onclick = loadResultsFromRemote;
  btnExportCsv.onclick = exportFilteredCsv;
  btnPrintReport.onclick = () => window.print();

  btnSourceModal.onclick = () => {
    resultsCsvUrlInput.value = getConfiguredResultsCsvUrl();
    sourceModal.classList.remove("hidden");
  };
  btnCloseSourceModal.onclick = () => sourceModal.classList.add("hidden");
  sourceModal.onclick = (e) => {
    if (e.target === sourceModal) sourceModal.classList.add("hidden");
  };
  btnSaveSourceUrl.onclick = () => {
    try {
      const val = resultsCsvUrlInput.value.trim();
      if (val) localStorage.setItem(LS_RESULTS_CSV, val);
      else localStorage.removeItem(LS_RESULTS_CSV);
    } catch (_) {}
    sourceModal.classList.add("hidden");
    loadResultsFromRemote();
  };
  btnClearSourceUrl.onclick = () => {
    try {
      localStorage.removeItem(LS_RESULTS_CSV);
    } catch (_) {}
    resultsCsvUrlInput.value = "";
    sourceModal.classList.add("hidden");
    loadResultsFromRemote();
  };

  btnManageRules.onclick = openRulesModal;
  btnCloseMergeModal.onclick = () => mergeModal.classList.add("hidden");
  btnCancelMerge.onclick = () => mergeModal.classList.add("hidden");
  mergeModal.onclick = (e) => {
    if (e.target === mergeModal) mergeModal.classList.add("hidden");
  };
  btnConfirmMerge.onclick = () => {
    const targetName = mergeTargetSelect.value;
    if (!mergeSourceKey || !targetName) return;
    const rules = loadPeopleRules();
    rules.aliases[mergeSourceKey] = targetName;
    savePeopleRules(rules);
    mergeModal.classList.add("hidden");
    renderAll();
  };

  btnCloseRulesModal.onclick = () => rulesModal.classList.add("hidden");
  btnDoneRules.onclick = () => rulesModal.classList.add("hidden");
  rulesModal.onclick = (e) => {
    if (e.target === rulesModal) rulesModal.classList.add("hidden");
  };
  btnResetAllRules.onclick = () => {
    if (!confirm("¿Restaurar todos los participantes combinados y ocultos?")) return;
    savePeopleRules({ aliases: {}, excluded: [], excludedLabels: {} });
    rulesModal.classList.add("hidden");
    renderAll();
  };

  // Pestañas
  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.onclick = () => {
      document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
      tab.classList.add("active");
      const panel = $(`#tab-${tab.dataset.tab}`);
      if (panel) panel.classList.remove("hidden");
    };
  });

  compHotelFilter.onchange = renderCompliance;
  [qbSearch, qbMod, qbLevel].forEach((el) => (el.oninput = el.onchange = renderQuestionBank));
  btnOpenRulesFromSystem.onclick = openRulesModal;
  btnClosePersonModal.onclick = () => personModal.classList.add("hidden");
  personModal.onclick = (e) => {
    if (e.target === personModal) personModal.classList.add("hidden");
  };

  // ===== Boot =====
  initTheme();
  try {
    if (sessionStorage.getItem(SS_AUTH) === "1") enterDashboard();
  } catch (_) {}
})();
