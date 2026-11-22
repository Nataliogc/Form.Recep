# Registro de Versiones · Form.Recep

| Versión Actual | Fecha | Estado |
| :--- | :--- | :--- |
| **`v2.2.2`** | **22/11/2026** | Producción |

---

## 📝 Historial de Modificaciones del Sistema

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
