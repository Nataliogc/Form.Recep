/**
 * Configuración central · Formación Recepción (Sercotel Guadiana & Cumbria Spa&Hotel)
 * Integrado con el sistema oficial Protocolo-Recep.
 */
window.APP_CONFIG = {
  version: "2.9.0",
  appName: "FORMACIÓN RECEPCIÓN - GUADIANA & CUMBRIA",
  hotelsLabel: "Sercotel Guadiana & Cumbria Spa&Hotel",

  // Enlace al portal hermano Protocolo-Recep (Manual Operativo vivo)
  PROTOCOLO_RECEP_URL: "https://cumbriaspahotel.github.io/Protocolo-Recep/",
  PROTOCOLO_SPA_URL: "https://cumbriaspahotel.github.io/Protocolo-Recep/spa.html#inicio",
  PROTOCOLO_DATA_JS_URL: "https://cumbriaspahotel.github.io/Protocolo-Recep/data.js",

  // Endpoint de Google Apps Script donde se registran los resultados (conservado del original)
  RESULTS_ENDPOINT:
    "https://script.google.com/macros/s/AKfycbw0zjfjTf_XzNLLCN6aVe17WiwyMgoY7N3Rz6Bx3NySrf3Q5N1wLVxdLxswWrGOdwFHmA/exec",

  // URL CSV publicada de "Formación – Resultados.gsheet" para el panel admin.html
  RESULTS_CSV_URL:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSnOCqA2I7YZDIlrj_hRG44RSlZeRrIl6BkIhqXCac4eBPT_NW4deo2QogzhvUb-pVTT_ey0Vh1jyKh/pub?output=csv",

  // Clave de acceso al panel privado admin.html (puedes cambiarla aquí)
  ADMIN_PASSWORD: "guadiana2026",

  // Conexión de solo lectura con la plantilla oficial de Turnos-new (Supabase)
  TURNOS_SUPABASE_URL: "https://drvmxranbpumianmlzqr.supabase.co",
  TURNOS_SUPABASE_ANON_KEY: "sb_publishable_MEpdfeO_ZGkMkg0_eKZKnQ_QCJxDrfZ",

  // (Opcional) URL pública CSV de Google Sheets para cargar preguntas en tiempo real
  LIVE_QUESTIONS_CSV_URL: "",

  // (Opcional) URL JSON (por ejemplo, doGet() del mismo Apps Script)
  LIVE_QUESTIONS_JSON_URL: "",

  // Rutas locales de respaldo dentro del repositorio / GitHub Pages
  CSV_CANDIDATES: [
    "./data/plantilla_preguntas_unica.csv",
    "data/plantilla_preguntas_unica.csv",
    "/data/plantilla_preguntas_unica.csv",
  ],

  META_URL: "./data/meta.json",
  FALLBACK_JS_URL: "./data/data.js",

  // Estructura oficial de módulos y submódulos sincronizada con Protocolo-Recep y spa.html
  MODULE_TREE_HOTEL: [
    {
      code: "1",
      name: "Turnos y Personal",
      submodules: [
        "Operativa Diaria",
        "Turno de Mañana",
        "Turno de Tarde",
        "Turno de Noche",
        "Bienvenida y Adaptación",
        "Gestión de Personal",
      ],
    },
    {
      code: "2",
      name: "Flujo de Recepción",
      submodules: ["El Ciclo del Huésped", "Finanzas y Caja", "Calidad e Incidencias"],
    },
    {
      code: "3",
      name: "Reservas y Sistemas",
      submodules: [
        "Tarifas y Políticas",
        "Auditoría y Control",
        "Conectividad",
        "Software PMS",
        "Canales Online",
        "Gestión Individual",
      ],
    },
    {
      code: "4",
      name: "Eventos y Grupos",
      submodules: ["Operativa de Grupos", "Coordinación y Menús"],
    },
    {
      code: "5",
      name: "Seguridad",
      submodules: ["Autoprotección y Emergencias"],
    },
    {
      code: "6",
      name: "Biblioteca y Enlaces",
      submodules: ["Comunicados y Noticias", "Manuales Oficiales", "Reportes de Calidad"],
    },
  ],

  MODULE_TREE_SPA: [
    {
      code: "1",
      name: "Procedimientos Spa",
      submodules: ["Procedimientos Spa"],
    },
    {
      code: "2",
      name: "Bonos Spa",
      submodules: ["Bonos Regalo", "Bonos Externos"],
    },
    {
      code: "3",
      name: "Manuales Spa",
      submodules: ["GEST-SPA / ZENITH"],
    },
  ],

  // Mapeo orientativo de módulos de formación a secciones del Manual Protocolo-Recep
  MODULE_PROTOCOL_HINTS: {
    "Turnos y Personal": { section: "1 · Turnos y Personal", query: "Turno" },
    "Flujo de Recepción": { section: "2 · Flujo de Recepción", query: "Caja" },
    "Reservas y Sistemas": { section: "3 · Reservas y Sistemas", query: "Reservas" },
    "Eventos y Grupos": { section: "4 · Eventos y Grupos", query: "Grupo" },
    "Seguridad": { section: "5 · Seguridad", query: "Seguridad" },
    "Biblioteca y Enlaces": { section: "6 · Biblioteca y Enlaces", query: "Manual" },
    "Procedimientos Spa": { section: "Portal Spa · Procedimientos Spa", query: "Spa" },
    "Bonos Spa": { section: "Portal Spa · Bonos y Bonos Externos", query: "Bono" },
    "Manuales Spa": { section: "Portal Spa · Manuales GEST-SPA / ZENITH", query: "GEST-SPA" },
  },

  // Opciones de tamaño de sesión
  SESSION_SIZES: [
    { id: "quick", label: "Rápido", count: 10, desc: "~5 min" },
    { id: "standard", label: "Estándar", count: 30, desc: "~15 min" },
    { id: "all", label: "Completo", count: 9999, desc: "Todo el banco" },
  ],
  DEFAULT_SESSION_SIZE: 30,
};
