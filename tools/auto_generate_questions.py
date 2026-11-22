#!/usr/bin/env python3
"""
Generador automático de preguntas desde Protocolo-Recep usando Gemini AI.

Cómo funciona:
  1. Descarga Protocolo-Recep/data.json (o lee --local-json).
  2. Detecta protocolos nuevos o modificados comparando su hash de contenido contra data/sync_state.json.
  3. Para cada protocolo cambiado (hasta --max-protocols por ejecución para respetar límites gratuitos):
     - Si el protocolo ya tenía preguntas generadas antes, marca las antiguas como activo=0 en el CSV
       (sin borrarlas, para no romper estadísticas históricas en Google Sheets).
     - Llama a Gemini (gemini-2.5-flash) para redactar preguntas tipo test basadas fielmente en el protocolo.
     - Valida el JSON y añade las nuevas preguntas a data/plantilla_preguntas_unica.csv.
  4. Actualiza data/sync_state.json.

Si no existe la variable de entorno GEMINI_API_KEY, sale con código 0 sin error (modo seguro).
"""
import argparse
import csv
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "data" / "plantilla_preguntas_unica.csv"
STATE_PATH = ROOT / "data" / "sync_state.json"

DEFAULT_PROTOCOLO_URL = "https://cumbriaspahotel.github.io/Protocolo-Recep/data.json"
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

ALLOWED_MODULES = [
    "Operativa Turnos",
    "Atención al Cliente y Protocolo",
    "Gestión Administrativa y Cobros",
    "Reservas",
    "Errores Comunes",
    "Supervisión de Ocupación (Inventory)",
    "PMS y Sistemas (Zenith / Onity)",
    "Canales de Venta y OTAs",
    "Grupos y Eventos",
    "Spa y Servicios",
]

ALLOWED_DTOS = ["Recepción", "Recep-Guadiana", "Recep-Cumbria"]
ALLOWED_LEVELS = ["Básico", "Intermedio", "Avanzado"]

CSV_HEADERS = [
    "id",
    "dto",
    "categoría",
    "nivel",
    "texto",
    "A",
    "B",
    "C",
    "D",
    "correct_letter",
    "why",
    "activo",
]


def strip_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    text = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", raw_html)
    text = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</li>|</tr>|</h[1-6]>", "\n", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in text.splitlines()]
    return "\n".join(ln for ln in lines if ln)


def protocol_key(p: dict) -> str:
    sec = str(p.get("section") or "").strip()
    title = str(p.get("title") or "").strip()
    base = f"{sec}||{title}".lower()
    return hashlib.sha1(base.encode("utf-8")).hexdigest()[:12]


def content_hash(title: str, clean_text: str) -> str:
    return hashlib.sha256(f"{title}\n{clean_text}".encode("utf-8")).hexdigest()[:16]


def load_protocols(url: str, local_json: str | None) -> list[dict]:
    if local_json:
        raw = Path(local_json).read_text(encoding="utf-8")
        return json.loads(raw)
    req = urllib.request.Request(url, headers={"User-Agent": "FormRecep-AutoGen/2.1"})
    with urllib.request.urlopen(req, timeout=25) as resp:
        return json.loads(resp.read().decode("utf-8", errors="replace"))


def load_state() -> dict:
    if STATE_PATH.exists():
        try:
            data = json.loads(STATE_PATH.read_text(encoding="utf-8"))
            if isinstance(data, dict) and isinstance(data.get("protocols"), dict):
                return data
        except Exception:
            pass
    return {"version": 1, "last_run": None, "protocols": {}}


def save_state(state: dict) -> None:
    state["last_run"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_csv_rows() -> tuple[list[str], list[dict], int]:
    if not CSV_PATH.exists():
        return CSV_HEADERS, [], 0
    raw = CSV_PATH.read_text(encoding="utf-8-sig", errors="replace")
    first_line = raw.splitlines()[0] if raw.splitlines() else ""
    delim = ";" if first_line.count(";") > first_line.count(",") else ","
    reader = csv.DictReader(raw.splitlines(), delimiter=delim)
    headers = list(reader.fieldnames or CSV_HEADERS)
    rows = list(reader)
    max_id = 0
    for r in rows:
        try:
            v = int(str(r.get("id", "")).strip())
            if v > max_id:
                max_id = v
        except ValueError:
            pass
    return headers, rows, max_id


def write_csv_rows(headers: list[str], rows: list[dict]) -> None:
    with CSV_PATH.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def infer_default_module(p: dict) -> str:
    sec = str(p.get("section") or "").strip()
    title = str(p.get("title") or "").lower()
    if any(w in title for w in ("onity", "onportal", "zenith", "cerradura", "pms", "llave")):
        return "PMS y Sistemas (Zenith / Onity)"
    if any(w in title for w in ("siteminder", "witbooking", "booking", "expedia", "channel", "ota")):
        return "Canales de Venta y OTAs"
    if any(w in title for w in ("grupo", "evento", "boda", "salón", "salon", "banquete")):
        return "Grupos y Eventos"
    if any(w in title for w in ("spa", "circuito", "masaje", "escapada")):
        return "Spa y Servicios"
    if sec.startswith("1") or "turno" in title:
        return "Operativa Turnos"
    if sec.startswith("3") or "reserva" in title:
        return "Reservas"
    if sec.startswith("4") or "error" in title or "problema" in title or "incidencia" in title:
        return "Errores Comunes"
    if sec.startswith("5") or "inventory" in title or "ocupación" in title or "ocupacion" in title:
        return "Supervisión de Ocupación (Inventory)"
    if any(w in title for w in ("factur", "caja", "cobro", "pago", "tarjeta", "crédito", "credito", "tpv")):
        return "Gestión Administrativa y Cobros"
    return "Atención al Cliente y Protocolo"


def infer_default_dto(title: str, clean_text: str) -> str:
    blob = f"{title}\n{clean_text[:1500]}".lower()
    has_g = "guadiana" in blob
    has_c = "cumbria" in blob
    if has_g and not has_c:
        return "Recep-Guadiana"
    if has_c and not has_g:
        return "Recep-Cumbria"
    return "Recepción"


def call_gemini(api_key: str, protocol: dict, clean_text: str, num_questions: int) -> list[dict]:
    title = str(protocol.get("title") or "").strip()
    section = str(protocol.get("section") or "").strip()
    default_mod = infer_default_module(protocol)
    default_dto = infer_default_dto(title, clean_text)

    excerpt = clean_text[:6500]
    prompt = f"""Eres el Director de Recepción y Calidad de Sercotel Guadiana y Cumbria Spa&Hotel.
Evalúa el siguiente documento del manual interno y, SOLO si contiene procedimientos operativos reales, redacta entre 1 y {num_questions} preguntas tipo test de alto valor práctico para el equipo de recepción.

DOCUMENTO:
- Título: {title}
- Sección: {section or 'General'}
- Contenido:
\"\"\"
{excerpt}
\"\"\"

REGLAS ESTRICTAS DE CALIDAD (MUY IMPORTANTE):
1. SI el documento es puramente turístico, cultural, institucional, un enlace sin procedimiento o no contiene reglas operativas evaluables (ej. "Trabaja con nosotros", agenda cultural, enlaces externos sin pasos), DEVUELVE UN ARRAY VACÍO: []. NUNCA inventes preguntas de relleno.
2. PROHIBIDO hacer preguntas tontas, obvias o triviales (ej. "¿Es importante ser amable?", "¿De qué color es el botón?", preguntas sobre títulos o formato del documento).
3. ENFÓCATE EN OPERATIVA REAL DE MOSTRADOR: pasos obligatorios en PMS/Channel/Onity, horarios límite, gestión de caja/facturación/garantías, políticas de cancelación/no-show, coordinación con pisos/dirección y prevención de errores reales.
4. OPCIONES REALISTAS: las 4 opciones (A, B, C, D) deben ser verosímiles y de longitud similar (errores que cometería un recepcionista sin experiencia). PROHIBIDO poner opciones absurdas o ridículas que delaten la respuesta correcta.
5. FIDELIDAD ABSOLUTA: cada pregunta y explicación ("why") debe basarse exclusivamente en hechos concretos del texto anterior (no inventes importes, horarios ni normas).
6. "dto" debe ser uno de: {json.dumps(ALLOWED_DTOS, ensure_ascii=False)} (sugerido: "{default_dto}").
7. "categoria" debe ser exactamente uno de: {json.dumps(ALLOWED_MODULES, ensure_ascii=False)} (sugerido: "{default_mod}").
8. "nivel" debe ser uno de: {json.dumps(ALLOWED_LEVELS, ensure_ascii=False)}.
9. Responde ÚNICAMENTE con un array JSON válido de objetos con estas claves exactas:
   "dto", "categoria", "nivel", "texto", "A", "B", "C", "D", "correct_letter", "why" (o [] si no aplica).
"""

    if api_key.startswith("AQ."):
        endpoints = [
            f"https://aiplatform.googleapis.com/v1/publishers/google/models/{GEMINI_MODEL}:generateContent?key={api_key}",
            f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}",
        ]
    else:
        endpoints = [
            f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}",
        ]

    body_bytes = json.dumps(
        {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }
    ).encode("utf-8")

    data = None
    last_err = None
    for endpoint in endpoints:
        req = urllib.request.Request(
            endpoint,
            data=body_bytes,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            break
        except urllib.error.HTTPError as exc:
            err_body = ""
            try:
                err_body = exc.read().decode("utf-8", errors="replace")[:260]
            except Exception:
                pass
            last_err = RuntimeError(f"HTTP {exc.code} {exc.reason}: {err_body}")
            if exc.code in (400, 401, 403, 404) and endpoint != endpoints[-1]:
                continue
            raise last_err
    if data is None:
        if last_err:
            raise last_err
        return []

    raw_text = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
        .strip()
    )
    if not raw_text:
        return []

    # Limpiar posibles bloques ```json
    raw_text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.S).strip()
    parsed = json.loads(raw_text)
    if isinstance(parsed, dict) and "questions" in parsed:
        parsed = parsed["questions"]
    if not isinstance(parsed, list):
        return []

    valid = []
    for item in parsed:
        if not isinstance(item, dict):
            continue
        texto = str(item.get("texto") or "").strip()
        A = str(item.get("A") or "").strip()
        B = str(item.get("B") or "").strip()
        C = str(item.get("C") or "").strip()
        D = str(item.get("D") or "").strip()
        corr = str(item.get("correct_letter") or "").strip().upper()
        why = str(item.get("why") or "").strip()
        if not (texto and A and B and C and D and corr in ("A", "B", "C", "D") and why):
            continue

        dto = str(item.get("dto") or default_dto).strip()
        if dto not in ALLOWED_DTOS:
            dto = default_dto
        cat = str(item.get("categoria") or default_mod).strip()
        if cat not in ALLOWED_MODULES:
            cat = default_mod
        nivel = str(item.get("nivel") or "Intermedio").strip()
        if nivel not in ALLOWED_LEVELS:
            nivel = "Intermedio"

        valid.append(
            {
                "dto": dto,
                "categoría": cat,
                "nivel": nivel,
                "texto": texto,
                "A": A,
                "B": B,
                "C": C,
                "D": D,
                "correct_letter": corr,
                "why": why,
            }
        )
    return valid


def main() -> int:
    parser = argparse.ArgumentParser(description="Generador automático de preguntas desde Protocolo-Recep con Gemini.")
    parser.add_argument("--url", default=os.environ.get("PROTOCOLO_DATA_URL", DEFAULT_PROTOCOLO_URL))
    parser.add_argument("--local-json", default=None, help="Ruta local a data.json de Protocolo-Recep (opcional)")
    parser.add_argument("--max-protocols", type=int, default=int(os.environ.get("MAX_PROTOCOLS_PER_RUN", "5")))
    parser.add_argument("--questions-per-protocol", type=int, default=3)
    parser.add_argument("--dry-run", action="store_true", help="Muestra qué protocolos cambiarían sin llamar a Gemini")
    parser.add_argument(
        "--init-baseline",
        action="store_true",
        help="Registra los protocolos actuales como base sin generar preguntas (solo se generarán los futuros cambios)",
    )
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key and not args.dry_run and not args.init_baseline:
        print("ℹ GEMINI_API_KEY no configurada. Se omite la generación automática con IA.")
        return 0

    try:
        protocols = load_protocols(args.url, args.local_json)
    except Exception as exc:
        print(f"⚠ No se pudo leer Protocolo-Recep ({exc}). Se omite la generación IA.")
        return 0

    state = load_state()
    tracked = state["protocols"]

    # Filtrar protocolos con contenido sustancial y deduplicar por clave (gana el más reciente)
    latest_by_key: dict[str, tuple[dict, str, str, str]] = {}
    for p in protocols:
        if not isinstance(p, dict):
            continue
        title = str(p.get("title") or "").strip()
        if not title or title.lower() == "no title":
            continue
        clean = strip_html(str(p.get("content") or ""))
        if len(clean) < 180:
            continue
        key = protocol_key(p)
        chash = content_hash(title, clean)
        existing = latest_by_key.get(key)
        if not existing or str(p.get("updated") or "") >= str(existing[0].get("updated") or ""):
            latest_by_key[key] = (p, key, chash, clean)

    candidates = []
    for p, key, chash, clean in latest_by_key.values():
        prev = tracked.get(key)
        if not prev or prev.get("hash") != chash:
            candidates.append((p, key, chash, clean, prev))

    # Priorizar los actualizados más recientemente
    candidates.sort(key=lambda item: str(item[0].get("updated") or ""), reverse=True)

    print(f"Protocolos con contenido válido revisados: {len(protocols)} · Pendientes/modificados: {len(candidates)}")

    if args.init_baseline:
        for p, key, chash, _, prev in candidates:
            tracked[key] = {
                "title": str(p.get("title") or "").strip(),
                "section": str(p.get("section") or "").strip(),
                "updated": str(p.get("updated") or ""),
                "hash": chash,
                "question_ids": prev.get("question_ids", []) if prev else [],
            }
        save_state(state)
        print(f"✅ Línea base inicializada en {STATE_PATH.name} ({len(tracked)} protocolos registrados).")
        return 0

    if not candidates:
        print("✅ Todo está al día: ningún protocolo ha cambiado desde la última sincronización.")
        return 0

    batch = candidates[: max(1, args.max_protocols)]
    if args.dry_run:
        print(f"[DRY-RUN] Se procesarían {len(batch)} protocolos:")
        for p, key, chash, clean, prev in batch:
            status = "MODIFICADO" if prev else "NUEVO"
            print(f"  - [{status}] {p.get('title')} (sec={p.get('section')}, {len(clean)} chars)")
        return 0

    headers, rows, max_id = read_csv_rows()
    existing_texts = {str(r.get("texto") or "").strip().lower() for r in rows}

    total_added = 0
    total_retired = 0

    for p, key, chash, clean, prev in batch:
        title = str(p.get("title") or "").strip()
        print(f"→ Generando preguntas para: {title} ...")
        try:
            generated = call_gemini(api_key, p, clean, args.questions_per_protocol)
        except urllib.error.HTTPError as exc:
            print(f"  ⚠ Error HTTP Gemini ({exc.code}) en '{title}': {exc.reason}")
            continue
        except Exception as exc:
            print(f"  ⚠ Error generando preguntas para '{title}': {exc}")
            continue

        if not generated:
            print(f"  ℹ Documento sin contenido operativo evaluable: '{title}' (omitido sin generar relleno).")
            tracked[key] = {
                "title": title,
                "section": str(p.get("section") or "").strip(),
                "updated": str(p.get("updated") or ""),
                "hash": chash,
                "question_ids": prev.get("question_ids", []) if prev else [],
                "skipped_non_operational": True,
            }
            continue

        # Desactivar preguntas antiguas de este protocolo si existían
        old_ids = set(str(x) for x in (prev.get("question_ids", []) if prev else []))
        if old_ids:
            for r in rows:
                if str(r.get("id", "")).strip() in old_ids and str(r.get("activo", "1")).strip() != "0":
                    r["activo"] = "0"
                    total_retired += 1

        new_ids = []
        for q in generated:
            if q["texto"].lower() in existing_texts:
                continue
            max_id += 1
            new_row = {
                "id": str(max_id),
                "dto": q["dto"],
                "categoría": q["categoría"],
                "nivel": q["nivel"],
                "texto": q["texto"],
                "A": q["A"],
                "B": q["B"],
                "C": q["C"],
                "D": q["D"],
                "correct_letter": q["correct_letter"],
                "why": q["why"],
                "activo": "1",
            }
            rows.append(new_row)
            existing_texts.add(q["texto"].lower())
            new_ids.append(max_id)
            total_added += 1

        tracked[key] = {
            "title": title,
            "section": str(p.get("section") or "").strip(),
            "updated": str(p.get("updated") or ""),
            "hash": chash,
            "question_ids": new_ids,
        }
        print(f"  ✓ Añadidas {len(new_ids)} preguntas (IDs: {new_ids})")
        time.sleep(1.5)  # Pausa amable para respetar rate limits del tier gratuito

    if total_added > 0 or total_retired > 0:
        write_csv_rows(headers, rows)
    save_state(state)

    print(f"✅ Sincronización IA completada: +{total_added} nuevas, {total_retired} sustituidas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
