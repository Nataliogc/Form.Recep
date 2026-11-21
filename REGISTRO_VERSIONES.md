# Registro de Versiones · Form.Recep

| Versión Actual | Fecha | Estado |
| :--- | :--- | :--- |
| **`v2.0.1`** | **22/11/2026** | Producción |

---

## 📝 Historial de Modificaciones del Sistema

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
