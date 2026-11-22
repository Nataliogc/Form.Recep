/**
 * Motor de carga de preguntas con prioridad "siempre actualizado":
 *  1. Google Sheets en vivo (CSV o JSON configurado en config.js o localStorage)
 *  2. CSV del repositorio (GitHub Pages, siempre sin caché)
 *  3. Caché local reciente (localStorage, por si hay corte de red)
 *  4. Respaldo estático data/data.js (funciona incluso abriendo index.html en file://)
 */
(function () {
  const CACHE_KEY = "form_recep_questions_cache_v2";
  const CUSTOM_URL_KEY = "form_recep_live_csv_url_v1";

  function decodeSmart(buf) {
    try {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      if (!text.includes("\uFFFD")) return text.replace(/^\uFEFF/, "");
    } catch (_) {}
    try {
      return new TextDecoder("windows-1252").decode(buf).replace(/^\uFEFF/, "");
    } catch (_) {}
    return "";
  }

  function detectDelimiter(sample) {
    const counts = { ",": 0, ";": 0, "\t": 0, "|": 0 };
    const lines = sample.split(/\r?\n/).slice(0, 6);
    for (const l of lines) {
      for (const k in counts) counts[k] += l.split(k).length - 1;
    }
    let best = ",",
      max = -1;
    for (const k in counts) {
      if (counts[k] > max) {
        max = counts[k];
        best = k;
      }
    }
    return best;
  }

  function parseCSV(text) {
    const delim = detectDelimiter(text);
    const rows = [];
    let row = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === delim) {
          row.push(cur);
          cur = "";
        } else if (ch === "\r" && next === "\n") {
          row.push(cur);
          rows.push(row);
          row = [];
          cur = "";
          i++;
        } else if (ch === "\n" || ch === "\r") {
          row.push(cur);
          rows.push(row);
          row = [];
          cur = "";
        } else {
          cur += ch;
        }
      }
    }
    if (cur.length > 0 || row.length > 0) {
      row.push(cur);
      rows.push(row);
    }

    const cleanRows = rows.filter((r) => r.some((cell) => String(cell).trim() !== ""));
    if (cleanRows.length < 2) return [];

    const headers = cleanRows[0].map((h) => String(h).trim().toLowerCase());
    return cleanRows.slice(1).map((cols) => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = (cols[i] ?? "").trim();
      });
      return obj;
    });
  }

  function djb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = (h << 5) + h + str.charCodeAt(i);
    return (h >>> 0).toString(36);
  }

  function resolveImageUrl(raw) {
    const val = String(raw || "").trim();
    if (!val) return "";
    if (/^(https?:\/\/|data:image\/)/i.test(val)) return val;
    if (/^protocolo:/i.test(val)) {
      const base = String(window.APP_CONFIG?.PROTOCOLO_RECEP_URL || "https://cumbriaspahotel.github.io/Protocolo-Recep/").replace(/\/+$/, "");
      const rel = val.replace(/^protocolo:/i, "").replace(/^\/+/, "");
      return `${base}/${rel}`;
    }
    if (val.startsWith("./") || val.startsWith("../") || val.startsWith("/") || val.includes("/")) {
      return val;
    }
    return `./img/preguntas/${val}`;
  }

  function normalizeList(arr) {
    const pick = (o, keys) => {
      for (const k of keys) {
        if (k in o && o[k] != null && String(o[k]).trim() !== "") return String(o[k]).trim();
      }
      return "";
    };

    const normalized = arr
      .map((r) => {
        const o = {};
        Object.keys(r || {}).forEach((k) => {
          o[k.toLowerCase().trim()] = r[k];
        });

        const dto = pick(o, ["dto", "departamento", "departamento (dto)", "dpto", "depto", "area", "área"]);
        const mod = pick(o, ["categoría", "categoria", "modulo", "módulo", "module", "mod", "tema", "bloque", "unidad"]);
        const nivel = pick(o, ["nivel", "level", "dificultad"]);
        const text = pick(o, ["texto", "text", "pregunta", "enunciado"]);
        const A = pick(o, ["a", "opcion_a", "opción_a", "opción a"]);
        const B = pick(o, ["b", "opcion_b", "opción_b", "opción b"]);
        const C = pick(o, ["c", "opcion_c", "opción_c", "opción c"]);
        const D = pick(o, ["d", "opcion_d", "opción_d", "opción d"]);

        let corrRaw = pick(o, ["correct_letter", "correct", "correcta", "letra_correcta", "respuesta_correcta", "respuesta"]);
        let corr = (corrRaw.toUpperCase().match(/^[A-D]$/) || [])[0] || "";
        if (!corr && corrRaw) {
          const low = corrRaw.toLowerCase();
          if (low === A.toLowerCase()) corr = "A";
          else if (low === B.toLowerCase()) corr = "B";
          else if (low === C.toLowerCase()) corr = "C";
          else if (low === D.toLowerCase()) corr = "D";
          else corr = (corrRaw.toUpperCase().match(/[A-D]/) || [])[0] || "";
        }

        const why = pick(o, ["why", "explicacion", "explicación", "comentario", "nota"]);
        const img = resolveImageUrl(pick(o, ["imagen", "image", "img", "captura", "foto"]));
        const whyImg = resolveImageUrl(pick(o, ["imagen_explicacion", "imagen_explicación", "imagen_why", "img_why", "image_explanation", "captura_explicacion"]));
        const activo = pick(o, ["activo", "activa", "enabled"]);
        let id = pick(o, ["id"]);
        if (!id) id = djb2([dto, mod, text].join("|"));

        return { id: String(id), dto, mod, nivel, text, A, B, C, D, correct: corr, why, img, whyImg, activo };
      })
      .filter((q) => {
        if (!q.text) return false;
        if (!q.activo) return true;
        return /^(1|true|si|sí|yes)$/i.test(q.activo);
      });

    return normalized;
  }

  async function fetchWithTimeout(url, timeoutMs = 6500) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const sep = url.includes("?") ? "&" : "?";
      const res = await fetch(`${url}${sep}_ts=${Date.now()}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } finally {
      clearTimeout(timer);
    }
  }

  function saveCache(questions, sourceLabel) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          savedAt: new Date().toISOString(),
          sourceLabel,
          questions,
        })
      );
    } catch (_) {}
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length) return parsed;
    } catch (_) {}
    return null;
  }

  function loadFallbackScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `${url}?v=${Date.now()}`;
      s.onload = () => {
        if (window.QUIZ && Array.isArray(window.QUIZ.questions) && window.QUIZ.questions.length) {
          resolve(normalizeList(window.QUIZ.questions));
        } else {
          reject(new Error("window.QUIZ vacío"));
        }
      };
      s.onerror = () => reject(new Error("No se pudo cargar data.js"));
      document.head.appendChild(s);
    });
  }

  async function fetchMeta(metaUrl) {
    try {
      const res = await fetchWithTimeout(metaUrl, 3000);
      return await res.json();
    } catch (_) {
      return null;
    }
  }

  function getConfiguredLiveUrl() {
    // Permite pasar ?sheet=URL por querystring, guardada en localStorage o en config.js
    const params = new URLSearchParams(location.search);
    const fromQuery = (params.get("sheet") || "").trim();
    if (fromQuery) {
      try {
        localStorage.setItem(CUSTOM_URL_KEY, fromQuery);
      } catch (_) {}
      return fromQuery;
    }
    try {
      const saved = (localStorage.getItem(CUSTOM_URL_KEY) || "").trim();
      if (saved) return saved;
    } catch (_) {}
    return (window.APP_CONFIG?.LIVE_QUESTIONS_CSV_URL || "").trim();
  }

  function setCustomLiveUrl(url) {
    try {
      const clean = (url || "").trim();
      if (clean) localStorage.setItem(CUSTOM_URL_KEY, clean);
      else localStorage.removeItem(CUSTOM_URL_KEY);
    } catch (_) {}
  }

  async function loadQuestions() {
    const cfg = window.APP_CONFIG || {};
    const isLocalFile = location.protocol === "file:";
    const errors = [];

    // 1) Google Sheets JSON en vivo (si está configurado)
    if (!isLocalFile && cfg.LIVE_QUESTIONS_JSON_URL) {
      try {
        const res = await fetchWithTimeout(cfg.LIVE_QUESTIONS_JSON_URL, 7000);
        const json = await res.json();
        const rows = Array.isArray(json) ? json : json.questions || json.data || [];
        const list = normalizeList(rows);
        if (list.length) {
          saveCache(list, "Google Sheets (en vivo)");
          return {
            questions: list,
            source: "live",
            sourceLabel: "Google Sheets · en vivo",
            updatedAt: new Date().toISOString(),
            errors,
          };
        }
      } catch (e) {
        errors.push(`Sheets JSON: ${e.message}`);
      }
    }

    // 2) Google Sheets CSV en vivo (config.js, localStorage o ?sheet=...)
    const liveCsvUrl = getConfiguredLiveUrl();
    if (!isLocalFile && liveCsvUrl) {
      try {
        const res = await fetchWithTimeout(liveCsvUrl, 7000);
        const text = decodeSmart(await res.arrayBuffer());
        const list = normalizeList(parseCSV(text));
        if (list.length) {
          saveCache(list, "Google Sheets (CSV en vivo)");
          return {
            questions: list,
            source: "live",
            sourceLabel: "Google Sheets · en vivo",
            updatedAt: new Date().toISOString(),
            errors,
          };
        }
        throw new Error("CSV remoto vacío o formato inválido");
      } catch (e) {
        errors.push(`Sheets CSV: ${e.message}`);
      }
    }

    // 3) CSV del repositorio (GitHub Pages)
    if (!isLocalFile) {
      for (const u of cfg.CSV_CANDIDATES || ["./data/plantilla_preguntas_unica.csv"]) {
        try {
          const res = await fetchWithTimeout(u, 6000);
          const text = decodeSmart(await res.arrayBuffer());
          const list = normalizeList(parseCSV(text));
          if (list.length) {
            const meta = cfg.META_URL ? await fetchMeta(cfg.META_URL) : null;
            const updatedAt = meta?.updated_at || res.headers.get("last-modified") || new Date().toISOString();
            saveCache(list, "Repositorio CSV");
            return {
              questions: list,
              source: "csv",
              sourceLabel: "Banco actualizado (CSV)",
              updatedAt,
              errors,
            };
          }
        } catch (e) {
          errors.push(`${u}: ${e.message}`);
        }
      }
    }

    // 4) Caché local del navegador
    const cached = readCache();
    if (cached) {
      return {
        questions: cached.questions,
        source: "cache",
        sourceLabel: "Caché local (sin conexión)",
        updatedAt: cached.savedAt,
        errors,
      };
    }

    // 5) Respaldo data.js (modo file:// o emergencia)
    try {
      const list = await loadFallbackScript(cfg.FALLBACK_JS_URL || "./data/data.js");
      return {
        questions: list,
        source: "fallback",
        sourceLabel: isLocalFile ? "Modo local (data.js)" : "Respaldo local (data.js)",
        updatedAt: null,
        errors,
      };
    } catch (e) {
      errors.push(`Fallback data.js: ${e.message}`);
    }

    return {
      questions: [],
      source: "error",
      sourceLabel: "Sin datos",
      updatedAt: null,
      errors,
    };
  }

  window.DataLoader = {
    loadQuestions,
    getConfiguredLiveUrl,
    setCustomLiveUrl,
  };
})();
