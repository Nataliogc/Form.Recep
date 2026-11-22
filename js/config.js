/**
 * Configuración central · Formación Recepción (Sercotel Guadiana & Cumbria Spa&Hotel)
 * Integrado con el sistema oficial Protocolo-Recep.
 */
window.APP_CONFIG = {
  version: "2.7.1",
  appName: "FORMACIÓN RECEPCIÓN - GUADIANA & CUMBRIA",
  hotelsLabel: "Sercotel Guadiana & Cumbria Spa&Hotel",

  // Enlace al portal hermano Protocolo-Recep (Manual Operativo vivo)
  PROTOCOLO_RECEP_URL: "https://cumbriaspahotel.github.io/Protocolo-Recep/",
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

  // Mapeo orientativo de módulos de formación a secciones del Manual Protocolo-Recep
  MODULE_PROTOCOL_HINTS: {
    "Operativa Turnos": { section: "1ª Sección · Turnos", query: "Turno" },
    "Atención al Cliente y Protocolo": { section: "2ª Sección · Check-in / Atención", query: "Check" },
    "Gestión Administrativa y Cobros": { section: "2ª Sección · Facturación y Caja", query: "Factura" },
    "Reservas": { section: "3ª Sección · Gestión de Reservas", query: "Reservas" },
    "Errores Comunes": { section: "4ª Sección · Problemas Comunes", query: "Problemas" },
    "Supervisión de Ocupación (Inventory)": { section: "5ª Sección · Inventory y Ocupación", query: "Inventory" },
    "PMS y Sistemas (Zenith / Onity)": { section: "10ª–12ª Sección · Onity y Zenith PMS", query: "Zenith" },
    "Canales de Venta y OTAs": { section: "Canales de Venta · SiteMinder / Booking / Witbooking", query: "Booking" },
    "Grupos y Eventos": { section: "4ª Sección · Eventos y Grupos", query: "Grupo" },
    "Seguridad y Emergencias": { section: "5ª Sección · Seguridad", query: "Seguridad" },
    "Spa y Servicios": { section: "Servicios · Cumbria Spa & Escapadas", query: "Spa" },
  },

  // Opciones de tamaño de sesión
  SESSION_SIZES: [
    { id: "quick", label: "Rápido", count: 10, desc: "~5 min" },
    { id: "standard", label: "Estándar", count: 30, desc: "~15 min" },
    { id: "all", label: "Completo", count: 9999, desc: "Todo el banco" },
  ],
  DEFAULT_SESSION_SIZE: 30,
};
