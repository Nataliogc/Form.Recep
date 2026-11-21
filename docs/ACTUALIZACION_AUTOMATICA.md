# Cómo mantener Form.Recep siempre actualizado y con preguntas automáticas

El sistema combina **generación automática de preguntas desde `Protocolo-Recep` con Gemini AI** y **sincronización en tiempo real**.

---

## 1. Activar la generación automática de preguntas (IA + GitHub Actions · Coste 0 €)

Cada mañana a las 06:00 UTC (o cuando lo lances manualmente desde la pestaña **Actions** de GitHub), el workflow `.github/workflows/sync-data.yml` ejecuta `tools/auto_generate_questions.py`:

1. Lee `Protocolo-Recep/data.json` y detecta qué protocolos son **nuevos o han cambiado** (comparando su huella de contenido en `data/sync_state.json`).
2. Si un protocolo **no cambió**, no gasta nada (0 llamadas a la IA).
3. Si un protocolo **es nuevo o se modificó**:
   - Marca como `activo = 0` las preguntas antiguas generadas para ese protocolo (sin borrarlas, para no romper estadísticas históricas en Google Sheets).
   - Genera 3 preguntas nuevas con `gemini-2.5-flash` basadas estrictamente en el protocolo actualizado.
   - Las guarda en `data/plantilla_preguntas_unica.csv` y regenera `data/data.js` y `data/meta.json`.

### Único paso para activarlo en GitHub (1 minuto):
1. Entra en tu repositorio en GitHub → **Settings → Secrets and variables → Actions**.
2. Pulsa **New repository secret**.
3. Crea el secreto:
   - **Name:** `GEMINI_API_KEY`
   - **Value:** tu clave de Gemini API (la misma que usas en `Protocolo-Recep`).
4. *(Opcional)* Ve a la pestaña **Actions → Sincronizar y generar preguntas automáticamente → Run workflow** para probarlo al momento.

> **Consejo:** El archivo `data/sync_state.json` ya está inicializado con los protocolos actuales como línea base, así que **solo se generarán preguntas para los protocolos nuevos o que edites a partir de hoy** (sin duplicar las 270 preguntas que ya tienes). Si algún día quieres regenerar preguntas de un protocolo concreto, basta con borrar su entrada en `data/sync_state.json`.

---

## 2. Edición instantánea opcional desde Google Sheets

Si además quieres poder retocar preguntas a mano desde Google Sheets y que se vean al segundo:

1. En Google Sheets: **Archivo → Compartir → Publicar en la web → CSV**.
2. Pega la URL en `js/config.js` dentro de `LIVE_QUESTIONS_CSV_URL` (o desde el icono ⚙️ en la web).
