# Cómo mantener Form.Recep siempre actualizado (sin tocar código)

El sistema soporta **actualización automática en tiempo real** mediante Google Sheets y sincronización nocturna en GitHub Actions.

---

## Opción 1 (Recomendada · Inmediata): Conectar Google Sheets en vivo

1. Abre tu hoja de preguntas en **Google Sheets** (con las mismas columnas: `id, dto, categoría, nivel, texto, A, B, C, D, correct_letter, why, activo`).
2. Ve a **Archivo → Compartir → Publicar en la web**.
3. Elige la pestaña de preguntas y selecciona el formato **Valores separados por comas (.csv)**. Pulsa **Publicar** y copia la URL.
4. Pega esa URL en **uno de estos sitios**:
   - **Para todo el equipo (recomendado):** en `js/config.js`, dentro de `LIVE_QUESTIONS_CSV_URL: "TU_URL_AQUI"`.
   - **Para probar al instante en tu navegador:** pulsa el icono de engranaje ⚙️ arriba a la derecha en la web, pega la URL y pulsa **Guardar y recargar**.

A partir de ese momento, cualquier pregunta que añadas, edites o desactives (`activo = 0`) en Google Sheets aparecerá **al segundo siguiente** en la web.

---

## Opción 2: Sincronización automática nocturna con GitHub Actions

El repositorio incluye el workflow `.github/workflows/sync-data.yml`:

- Cada vez que se actualiza `data/plantilla_preguntas_unica.csv`, valida las filas y regenera automáticamente `data/data.js` y `data/meta.json`.
- Si además añades la variable de repositorio `GOOGLE_SHEET_CSV_URL` en GitHub (**Settings → Secrets and variables → Actions → Variables**), GitHub descargará automáticamente el CSV desde Google Sheets todas las mañanas a las 06:00 UTC para que incluso el respaldo offline (`data.js`) esté siempre al día.
