# Registro de Versiones · Form.Recep

## [v2.0.0] - 22/11/2026
- **Módulos afectados**: Interfaz completa (`index.html`, `css/style.css`, `js/app.js`), Motor de datos (`js/config.js`, `js/data-loader.js`), PWA (`manifest.json`, `sw.js`), Automatización (`tools/build_data.py`, `.github/workflows/sync-data.yml`).
- **Tipo de cambio**: Rediseño mayor + Automatización de sincronización.
- **Resumen**:
  - **Alineación total con `Protocolo-Recep`**: adoptada la Guía de Estilo Oficial (paleta corporativa `#0a6aa1`, `#a58c5f`, `#27ae60`, `#b22222`, borde superior de gradiente oficial, tipografías `Outfit` + `Inter`, FontAwesome 6, cabecera oscura con indicador de última actualización y botón amarillo de Modo Oscuro).
  - **Puente vivo con `Protocolo-Recep`**: enlace directo en cabecera, bloque lateral con las últimas actualizaciones del manual operativo (`data.json`) y botón contextual *"Consultar en Protocolo-Recep"* dentro de cada explicación.
  - **Unificación responsive**: `index.html` funciona en escritorio, tablet y móvil; `index.mobile.html` redirige automáticamente para mantener compatibilidad con enlaces antiguos.
  - **Nueva experiencia de test (Modo Enfoque)**: selector visual por DTO, módulo, nivel (`Básico/Intermedio/Avanzado`) y duración (`Rápido 10`, `Estándar 30`, `Completo`); atajos de teclado (`A–D`, `Enter`), racha de aciertos, cronómetro, historial local y resumen con anillo de puntuación y desglose por módulo.
  - **Siempre actualizado**: carga prioritaria desde Google Sheets en vivo (configurable desde `js/config.js`, el botón ⚙️ o `?sheet=...`), fallback automático a CSV, caché local y `data.js`, más GitHub Action diaria que valida y regenera `data/data.js` y `data/meta.json`.
