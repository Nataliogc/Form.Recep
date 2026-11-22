(function () {
  const CFG = window.APP_CONFIG || {};
  const $ = (s) => document.querySelector(s);

  const SS_AUTH = "form_recep_admin_auth_v1";
  const LS_THEME = "form_recep_theme_v1";
  const LS_RESULTS_CSV = "form_recep_admin_results_csv_v1";

  let ALL_RESULTS = [];
  let QUESTIONS_BY_ID = new Map();
  let chartModules = null;
  let chartDist = null;

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
  const csvFileInput = $("#csvFileInput");
  const btnLoadDemo = $("#btnLoadDemo");
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

  const peopleCountTag = $("#peopleCountTag");
  const peopleTableBody = $("#peopleTableBody");
  const missedQuestionsList = $("#missedQuestionsList");
  const rowsCountTag = $("#rowsCountTag");
  const sessionsTableBody = $("#sessionsTableBody");

  const sourceModal = $("#sourceModal");
  const btnCloseSourceModal = $("#btnCloseSourceModal");
  const resultsCsvUrlInput = $("#resultsCsvUrlInput");
  const btnClearSourceUrl = $("#btnClearSourceUrl");
  const btnSaveSourceUrl = $("#btnSaveSourceUrl");

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
    const pick = (o, keys) => {
      for (const k of keys) {
        if (k in o && o[k] != null && String(o[k]).trim() !== "") return o[k];
      }
      return "";
    };
    return (rawArr || [])
      .map((r) => {
        const o = {};
        Object.keys(r || {}).forEach((k) => (o[k.toLowerCase().trim()] = r[k]));
        const nombre = String(pick(o, ["nombre", "empleado", "usuario", "recepcionista", "name"])).trim();
        const dto = String(pick(o, ["dto", "departamento", "hotel"])).trim() || "Todos";
        const modulo = String(pick(o, ["modulo", "módulo", "categoría", "categoria"])).trim() || "General";
        const nivel = String(pick(o, ["nivel", "level"])).trim() || "Todos";
        const total = Number(pick(o, ["total", "preguntas"])) || 0;
        const aciertos = Number(pick(o, ["aciertos", "ok", "correctas"])) || 0;
        const fallos = Number(pick(o, ["fallos", "ko", "errores"])) || Math.max(0, total - aciertos);
        const pctRaw = pick(o, ["pct", "porcentaje", "nota", "score"]);
        const pct = pctRaw !== "" ? Math.round(Number(String(pctRaw).replace("%", "").replace(",", "."))) : total ? Math.round((aciertos / total) * 100) : 0;
        const dur = Number(pick(o, ["duracion_seg", "duración_seg", "duracion", "tiempo", "segundos"])) || 0;
        const date = parseFlexibleDate(pick(o, ["fecha", "timestamp", "date", "marca temporal", "created_at"]));
        const detalle_fallos = parseIdList(pick(o, ["detalle_fallos", "falladas", "ids_fallos", "errores_ids"]));
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
      QUESTIONS_BY_ID = new Map();
      (res.questions || []).forEach((q) => QUESTIONS_BY_ID.set(String(q.id), q));
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

    return ALL_RESULTS.filter((r) => {
      if (q && !r.nombre.toLowerCase().includes(q)) return false;
      if (d && r.dto !== d) return false;
      if (m && r.modulo !== m) return false;
      if (cutoff && r.date && r.date.getTime() < cutoff) return false;
      return true;
    });
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
    renderPeopleTable(list);
    renderMissedQuestions(list);
    renderSessionsTable(list);
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
    const map = new Map();
    list.forEach((r) => {
      const key = (r.nombre || "Sin nombre").trim();
      if (!map.has(key)) map.set(key, { name: key, sessions: 0, sum: 0, best: 0, last: null });
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
      peopleTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">Sin datos para este filtro.</td></tr>';
      return;
    }

    peopleTableBody.innerHTML = rows
      .map(
        (p) => `
        <tr>
          <td><strong>${esc(p.name)}</strong></td>
          <td>${p.sessions}</td>
          <td><span class="score-badge ${badgeClass(p.avg)}">${p.avg}%</span></td>
          <td>${p.best}%</td>
          <td style="color:var(--text-muted);font-size:12.5px">${p.last ? esc(p.last.toLocaleDateString("es-ES")) : "—"}</td>
        </tr>`
      )
      .join("");
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
    rowsCountTag.textContent = `${list.length} registros`;
    if (!list.length) {
      sessionsTableBody.innerHTML = '<tr><td colspan="8" class="empty-state">No hay sesiones registradas para mostrar.</td></tr>';
      return;
    }

    sessionsTableBody.innerHTML = list
      .slice(0, 150)
      .map(
        (r) => `
        <tr>
          <td style="white-space:nowrap;font-size:12.5px;color:var(--text-muted)">${esc(formatDate(r.date))}</td>
          <td><strong>${esc(r.nombre || "—")}</strong></td>
          <td>${esc(r.dto)}</td>
          <td>${esc(r.modulo)}</td>
          <td>${esc(r.nivel)}</td>
          <td>${r.aciertos}/${r.total}</td>
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
    loadQuestionsIndex().then(loadResultsFromRemote);
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
  [fSearch, fDept, fMod, fRange].forEach((el) => (el.oninput = el.onchange = renderAll));
  btnRefreshResults.onclick = loadResultsFromRemote;
  btnLoadDemo.onclick = loadDemoData;
  btnExportCsv.onclick = exportFilteredCsv;
  btnPrintReport.onclick = () => window.print();

  csvFileInput.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    ALL_RESULTS = normalizeResults(parseCSV(text));
    populateFilterOptions();
    renderAll();
    setBanner("ok", `<i class="fas fa-file-csv"></i> <b>Archivo importado:</b> ${esc(file.name)} (${ALL_RESULTS.length} sesiones).`);
    csvFileInput.value = "";
  };

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

  // ===== Boot =====
  initTheme();
  try {
    if (sessionStorage.getItem(SS_AUTH) === "1") enterDashboard();
  } catch (_) {}
})();
