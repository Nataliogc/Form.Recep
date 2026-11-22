# Registro de Versiones · Form.Recep

| Versión Actual | Fecha | Estado |
| :--- | :--- | :--- |
| **`v2.6.2`** | **22/11/2026** | Producción |

---

## 📝 Historial de Modificaciones del Sistema

### [v2.6.2] — 22/11/2026
- **Módulos Afectados:** Automatización IA
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Autodescubrimiento automático de modelos Gemini disponibles para la clave API y caché de endpoint activo en auto_generate_questions.py

### [v2.6.1] — 22/11/2026
- **Módulos Afectados:** Automatización IA
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Actualizado el modelo de Gemini a gemini-3.8-flash con fallback automático de modelos en auto_generate_questions.py

### [v2.6.0] — 22/11/2026
- **Módulos Afectados:** Automatización IA, Integración Protocolo-Recep
- **Tipo de Cambio:** Nueva Característica / Mejora
- **Detalle de Cambios:**
  - Conectado el generador IA directamente a Protocolo-Recep/data.js (72 protocolos en vivo + 16 canales de venta: Smartbox, Wonderbox, Gest-Spa, Onity RFID, Segmentación, etc.)

### [v2.5.5] — 22/11/2026
- **Módulos Afectados:** Automatización IA
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Corregido enrutamiento y fallback HTTP 400 para claves AQ.* (Vertex AI / AI Studio) en auto_generate_questions.py

### [v2.5.4] — 22/11/2026
- **Módulos Afectados:** Panel Administrador
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Añadido filtro rápido de últimas sesiones (Últimas 5/10/20, 24h y 7 días) en el historial del Panel de Administrador

### [v2.5.3] — 22/11/2026
- **Módulos Afectados:** Automatización IA, Configuración
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Ampliados los módulos del generador IA (Zenith/Onity, Canales/OTAs, Grupos/Eventos, Spa) y habilitados los protocolos de 2026 para generación automática

### [v2.5.2] — 22/11/2026
- **Módulos Afectados:** Panel Administrador, Portada
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Añadidos filtros por nota y paginación (10/20/50 por página) al historial de sesiones y corregido cálculo de nota cuando total=0 en filas históricas

### [v2.5.1] — 22/11/2026
- **Módulos Afectados:** Panel Administrador, Portada
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Corregido cálculo de porcentajes >100% cuando Google Sheets guarda el porcentaje en la columna de aciertos y acotado seguro a 0-100%

### [v2.5.0] — 22/11/2026
- **Módulos Afectados:** Privacidad, Portada, Integración Turnos-new
- **Tipo de Cambio:** Nueva Característica / Mejora
- **Detalle de Cambios:**
  - Protección por privacidad con Nº de empleado (id_interno de Turnos-new) para desbloquear Sesiones, Tu media e historial personal en portada

### [v2.4.3] — 22/11/2026
- **Módulos Afectados:** Integración Turnos-new, Panel Administrador
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Filtrado estricto de personal activo de Turnos-new excluyendo 'Baja empresa' y empleados con fecha_baja vigente en portada y panel admin

### [v2.4.2] — 22/11/2026
- **Módulos Afectados:** Portada, Estadísticas Personales
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Corregido el cálculo de Sesiones, Tu media y Últimas sesiones en portada para filtrar exclusivamente por la persona seleccionada usando los datos reales de Google Sheets

### [v2.4.1] — 22/11/2026
- **Módulos Afectados:** Identificación, Integración Turnos-new
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Restringido el acceso al test exclusivamente al personal activo de Turnos-new más la opción Prácticas + Nombre (guardado como 'Prácticas - Nombre')

### [v2.4.0] — 22/11/2026
- **Módulos Afectados:** Panel Administrador
- **Tipo de Cambio:** Nueva Característica / Mejora
- **Detalle de Cambios:**
  - Panel de Administrador ampliado a Centro de Control con 4 pestañas: Evolución mensual, Cumplimiento de plantilla Turnos-new con recordatorio WhatsApp, Ficha individual por empleado, Explorador del Banco de Preguntas y Accesos del ecosistema

### [v2.3.0] — 22/11/2026
- **Módulos Afectados:** Integración Turnos-new, Panel Administrador
- **Tipo de Cambio:** Nueva Característica / Mejora
- **Detalle de Cambios:**
  - Vinculado selector cerrado de recepcionistas con la plantilla activa de Turnos-new (Supabase) y añadida combinación automática/manual y exclusión de participantes en el Panel de Administrador

### [v2.2.5] — 22/11/2026
- **Módulos Afectados:** Panel Administrador
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Eliminados los botones innecesarios Importar CSV y Datos de prueba del Panel de Administrador

### [v2.2.4] — 22/11/2026
- **Módulos Afectados:** Panel Administrador
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Detección flexible de cabeceras de columnas (con espacios, tildes o alias) para detalle_fallos en el Panel de Administrador

### [v2.2.3] — 22/11/2026
- **Módulos Afectados:** Automatización IA
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Endurecidas las reglas de calidad de IA en auto_generate_questions.py para evitar preguntas obvias o de relleno y omitir documentos no operativos

### [v2.2.2] — 22/11/2026
- **Módulos Afectados:** Panel Administrador
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Habilitada carga remota de resultados CSV desde modo local (file://) y añadido cache-busting automático (?v=) en admin.html

### [v2.2.1] — 22/11/2026
- **Módulos Afectados:** Panel Administrador, Configuración
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Conectada la URL CSV en vivo de Formación – Resultados.gsheet en config.js para el Panel de Administrador

### [v2.2.0] — 22/11/2026
- **Módulos Afectados:** Panel Administrador
- **Tipo de Cambio:** Nueva Característica / Mejora
- **Detalle de Cambios:**
  - Nuevo Panel de Administrador privado (admin.html) con analítica de resultados, gráficas por módulo, ranking de recepcionistas, top preguntas más falladas y exportación CSV

### [v2.1.4] — 22/11/2026
- **Módulos Afectados:** Estilos, Interfaz
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Diseño fluido adaptable a todo el ancho de pantalla (1760px), formulario en 2 columnas compacto, limpieza de etiquetas en títulos de protocolos y bloqueo de autocompletado de gestores de contraseñas

### [v2.1.3] — 22/11/2026
- **Módulos Afectados:** Automatización IA
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Compatibilidad completa con el nuevo formato de claves AQ.* de Google AI Studio (Free tier) y Vertex AI con fallback automático

### [v2.1.2] — 22/11/2026
- **Módulos Afectados:** Automatización IA
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Soporte automático para claves Vertex AI (AQ.*) además de Google AI Studio (AIza*) en auto_generate_questions.py

### [v2.1.1] — 22/11/2026
- **Módulos Afectados:** Cabecera, Interfaz Pública
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Eliminados el indicador técnico de sincronización (CSV) y el botón de ajustes de la interfaz pública

### [v2.1.0] — 22/11/2026
- **Módulos Afectados:** Automatización IA, GitHub Actions
- **Tipo de Cambio:** Nueva Característica / Mejora
- **Detalle de Cambios:**
  - Generador automático de preguntas desde Protocolo-Recep con Gemini AI y GitHub Actions (auto_generate_questions.py + sync_state.json)

### [v2.0.1] — 22/11/2026
- **Módulos Afectados:** Cabecera, Versionado
- **Tipo de Cambio:** Mejora / Corrección
- **Detalle de Cambios:**
  - Añadido badge visible de versión en cabecera y sistema automático de control de versiones (bump-version.js + AGENTS.md)

### [v2.0.0] — 22/11/2026
- **Módulos Afectados:** Interfaz completa (`index.html`, `css/style.css`, `js/app.js`), Motor de datos (`js/config.js`, `js/data-loader.js`), PWA (`manifest.json`, `sw.js`), Automatización (`tools/build_data.py`, `.github/workflows/sync-data.yml`)
- **Tipo de Cambio:** Actualización Mayor
- **Detalle de Cambios:**
  - Alineación completa con la Guía de Estilo Oficial de `Protocolo-Recep` (paleta corporativa, borde de gradiente oficial, tipografías `Outfit` + `Inter`, FontAwesome 6, cabecera oscura y Modo Oscuro).
  - Puente vivo con `Protocolo-Recep`: enlace directo en cabecera, novedades recientes del manual y botón contextual *"Consultar en Protocolo-Recep"* en cada explicación.
  - Unificación responsive (`index.html` + redirección automática desde `index.mobile.html`), Modo Enfoque, filtro por nivel, duración configurable, atajos de teclado, racha, cronómetro y resumen con anillo de puntuación.
  - Sincronización siempre actualizada: Google Sheets CSV/JSON en vivo, fallback automático y GitHub Action diaria de validación y regeneración de `data/data.js` y `data/meta.json`.
