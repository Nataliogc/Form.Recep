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

DEFAULT_PROTOCOLO_URL = "https://cumbriaspahotel.github.io/Protocolo-Recep/data.js"
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "").strip()
GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-3.8-flash", "gemini-3.0-flash", "gemini-2.5-flash"]
DISCOVERED_MODELS: list[str] | None = None
WORKING_ENDPOINT: tuple[str, str] | None = None


def discover_available_models(api_key: str) -> list[str]:
    global DISCOVERED_MODELS
    if DISCOVERED_MODELS is not None:
        return DISCOVERED_MODELS

    found = []
    for base in ("https://generativelanguage.googleapis.com/v1beta/models",):
        try:
            req = urllib.request.Request(f"{base}?key={api_key}", headers={"User-Agent": "FormRecep-AutoGen/2.6"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
            for m in payload.get("models", []):
                methods = m.get("supportedGenerationMethods") or []
                name = str(m.get("name") or "").replace("models/", "").strip()
                if not name or "generateContent" not in methods:
                    continue
                if "gemini" in name.lower() and "embedding" not in name.lower() and "tts" not in name.lower() and "image" not in name.lower():
                    found.append(name)
        except Exception as exc:
            print(f"ℹ Aviso al listar modelos disponibles: {exc}")

    # Priorizar modelos flash más modernos (evitando preview/exp si hay estables)
    def score(name: str) -> tuple:
        low = name.lower()
        is_flash = 0 if "flash" in low else 1
        is_stable = 0 if ("exp" not in low and "preview" not in low) else 1
        nums = [int(x) for x in re.findall(r"\d+", low)]
        ver = tuple(-n for n in nums[:2]) if nums else (0, 0)
        return (is_flash, is_stable, ver, low)

    found.sort(key=score)
    if found:
        print(f"✓ Modelos Gemini detectados para esta clave: {', '.join(found[:5])}")
    DISCOVERED_MODELS = found
    return found

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
    "Seguridad y Emergencias",
    "Spa y Servicios",
]

ALLOWED_DTOS = ["Recepción", "Recep-Guadiana", "Recep-Cumbria", "Spa"]
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


def extract_js_array(js_text: str, var_name: str) -> list:
    m = re.search(rf"(?:var|const|let)\s+{re.escape(var_name)}\s*=\s*", js_text)
    if not m:
        return []
    decoder = json.JSONDecoder()
    idx = m.end()
    while idx < len(js_text) and js_text[idx] in " \t\r\n":
        idx += 1
    try:
        val, _ = decoder.raw_decode(js_text, idx)
        return val if isinstance(val, list) else []
    except Exception:
        return []


def parse_protocolo_source(raw: str) -> list[dict]:
    stripped = raw.lstrip()
    if stripped.startswith("[") or stripped.startswith("{"):
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, list) else []

    # Parsear data.js oficial de Protocolo-Recep (protocols_data + channels_config)
    items = []
    protocols = extract_js_array(raw, "protocols_data")
    for p in protocols:
        if isinstance(p, dict):
            items.append(p)

    channels = extract_js_array(raw, "channels_config")
    for ch in channels:
        if not isinstance(ch, dict) or not ch.get("name"):
            continue
        hotel = str(ch.get("hotel") or "").strip()
        parts = [
            f"Canal de venta: {ch.get('name')} ({hotel or 'Guadiana y Cumbria'})",
            str(ch.get("summary") or ""),
            str(ch.get("content") or ""),
            str(ch.get("notes") or ""),
            str(ch.get("errors") or ""),
            str(ch.get("htmlContent") or ""),
        ]
        items.append(
            {
                "title": f"Canal {ch.get('name')} ({hotel})" if hotel else f"Canal {ch.get('name')}",
                "section": "3.canales",
                "updated": "2026-10-01T00:00:00Z",
                "content": "\n".join(x for x in parts if x),
                "isChannel": True,
                "hotel": hotel,
            }
        )
    return items


def load_protocols(url: str, local_json: str | None) -> list[dict]:
    if local_json:
        raw = Path(local_json).read_text(encoding="utf-8", errors="replace")
        return parse_protocolo_source(raw)
    req = urllib.request.Request(url, headers={"User-Agent": "FormRecep-AutoGen/2.6"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    return parse_protocolo_source(raw)


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
    if p.get("isChannel") or any(w in title for w in ("siteminder", "witbooking", "booking", "expedia", "channel", "ota", "canal ")):
        return "Canales de Venta y OTAs"
    if any(w in title for w in ("onity", "onportal", "zenith", "cerradura", "pms", "llave")):
        return "PMS y Sistemas (Zenith / Onity)"
    if sec.startswith("5") or any(w in title for w in ("seguridad", "emergencia", "incendio", "evacuación", "evacuacion", "policía", "policia", "rgpd")):
        return "Seguridad y Emergencias"
    if sec.startswith("4") or any(w in title for w in ("grupo", "evento", "boda", "salón", "salon", "banquete")):
        return "Grupos y Eventos"
    if any(w in title for w in ("spa", "circuito", "masaje", "escapada")):
        return "Spa y Servicios"
    if p.get("isCritical") or any(w in title for w in ("error", "problema", "incidencia")):
        return "Errores Comunes"
    if sec.startswith("1") or "turno" in title:
        return "Operativa Turnos"
    if any(w in title for w in ("inventory", "ocupación", "ocupacion", "overbooking")):
        return "Supervisión de Ocupación (Inventory)"
    if sec.startswith("3") or "reserva" in title:
        return "Reservas"
    if any(w in title for w in ("factur", "caja", "cobro", "pago", "tarjeta", "crédito", "credito", "tpv")):
        return "Gestión Administrativa y Cobros"
    return "Atención al Cliente y Protocolo"


def is_spa_protocol(p: dict, clean_text: str) -> bool:
    sec = str(p.get("section") or "").strip()
    title = str(p.get("title") or "").lower()
    head = f"{title}\n{clean_text[:800]}".lower()
    if sec.startswith("5.2"):
        return True
    if any(w in title for w in ("gest-spa", "spa", "smartbox", "wonderbox", "ego experiencias", "circuito termal", "cabinas")):
        return True
    if "gest-spa" in head or "recepción del spa" in head or "circuito termal" in head:
        return True
    return False


def infer_default_dto(p: dict, title: str, clean_text: str) -> str:
    if is_spa_protocol(p, clean_text):
        return "Spa"
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
    spa_doc = is_spa_protocol(protocol, clean_text)
    default_mod = "Spa y Servicios" if spa_doc else infer_default_module(protocol)
    default_dto = infer_default_dto(protocol, title, clean_text)

    excerpt = clean_text[:6500]
    prompt = f"""Eres el Director de Recepción y Calidad de Sercotel Guadiana y Cumbria Spa&Hotel.
Evalúa el siguiente documento del manual interno y, SOLO si contiene procedimientos operativos reales, redacta entre 1 y {num_questions} preguntas tipo test de alto valor práctico para el equipo.

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
3. ENFÓCATE EN OPERATIVA REAL DE MOSTRADOR: pasos obligatorios en PMS/Channel/Onity/GEST-SPA, horarios límite, gestión de caja/facturación/garantías, políticas de cancelación/no-show, coordinación con pisos/terapeutas/dirección y prevención de errores reales.
4. OPCIONES REALISTAS: las 4 opciones (A, B, C, D) deben ser verosímiles y de longitud similar (errores que cometería un recepcionista sin experiencia). PROHIBIDO poner opciones absurdas o ridículas que delaten la respuesta correcta.
5. FIDELIDAD ABSOLUTA: cada pregunta y explicación ("why") debe basarse exclusivamente en hechos concretos del texto anterior (no inventes importes, horarios ni normas).
6. SEPARACIÓN HOTELES vs SPA ("dto") — OBLIGATORIO elegir exactamente uno de {json.dumps(ALLOWED_DTOS, ensure_ascii=False)} (sugerido: "{default_dto}"):
   - Usa "Spa" para TODO lo relativo al Spa, GEST-SPA, circuito termal, cabinas, terapeutas o bonos/cofres regalo del Spa.
   - Usa "Recep-Guadiana" solo si es exclusivo de Sercotel Guadiana.
   - Usa "Recep-Cumbria" solo si es exclusivo del Hotel Cumbria (alojamiento, no Spa).
   - Usa "Recepción" para la operativa común de ambos hoteles.
7. "categoria" debe ser exactamente uno de: {json.dumps(ALLOWED_MODULES, ensure_ascii=False)} (sugerido: "{default_mod}"). Si el documento es de Spa/GEST-SPA, usa "Spa y Servicios" (o "Errores Comunes" solo para incidencias).
8. "nivel" debe ser uno de: {json.dumps(ALLOWED_LEVELS, ensure_ascii=False)}.
9. Responde ÚNICAMENTE con un array JSON válido de objetos con estas claves exactas:
   "dto", "categoria", "nivel", "texto", "A", "B", "C", "D", "correct_letter", "why" (o [] si no aplica).
"""

    global WORKING_ENDPOINT
    if WORKING_ENDPOINT:
        endpoints = [WORKING_ENDPOINT]
    else:
        discovered = discover_available_models(api_key)
        models_to_try = list(dict.fromkeys(([GEMINI_MODEL] if GEMINI_MODEL else []) + discovered[:4] + GEMINI_FALLBACK_MODELS))
        endpoints = []
        for mdl in models_to_try:
            endpoints.append((mdl, f"https://generativelanguage.googleapis.com/v1beta/models/{mdl}:generateContent?key={api_key}"))
            if api_key.startswith("AQ."):
                endpoints.append((mdl, f"https://aiplatform.googleapis.com/v1/publishers/google/models/{mdl}:generateContent?key={api_key}"))

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
    errors_seen = []
    for mdl, endpoint in endpoints:
        req = urllib.request.Request(
            endpoint,
            data=body_bytes,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=65) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            if not WORKING_ENDPOINT:
                WORKING_ENDPOINT = (mdl, endpoint)
                print(f"  ✓ Usando modelo activo: {mdl}")
            break
        except urllib.error.HTTPError as exc:
            err_body = ""
            try:
                err_body = exc.read().decode("utf-8", errors="replace")[:180]
            except Exception:
                pass
            errors_seen.append(f"[{mdl}] HTTP {exc.code}: {err_body}")
            if exc.code in (400, 401, 403, 404, 429):
                continue
            raise RuntimeError(errors_seen[-1])
        except Exception as exc:
            errors_seen.append(f"[{mdl}] {exc}")
            continue
    if data is None:
        raise RuntimeError(" | ".join(errors_seen[:3]) if errors_seen else "Sin respuesta de Gemini")

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

        dto = "Spa" if spa_doc else str(item.get("dto") or default_dto).strip()
        if dto not in ALLOWED_DTOS:
            dto = default_dto
        cat = str(item.get("categoria") or default_mod).strip()
        if spa_doc and cat not in ("Spa y Servicios", "Errores Comunes"):
            cat = "Spa y Servicios"
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
        target_q = 5 if len(clean) >= 3500 else args.questions_per_protocol
        print(f"→ Generando hasta {target_q} preguntas para: {title} ...")
        try:
            generated = call_gemini(api_key, p, clean, target_q)
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
