#!/usr/bin/env python3
"""
Valida data/plantilla_preguntas_unica.csv (o lo descarga desde GOOGLE_SHEET_CSV_URL si existe)
y regenera automáticamente:
  - data/data.js   (respaldo offline / file://)
  - data/meta.json (fecha de actualización y resumen del banco)
"""
import csv
import io
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "data" / "plantilla_preguntas_unica.csv"
DATA_JS_PATH = ROOT / "data" / "data.js"
META_JSON_PATH = ROOT / "data" / "meta.json"


def pick(row: dict, keys: list[str]) -> str:
    for k in keys:
        if k in row and row[k] is not None and str(row[k]).strip() != "":
            return str(row[k]).strip()
    return ""


def maybe_sync_remote_csv() -> bool:
    url = os.environ.get("GOOGLE_SHEET_CSV_URL", "").strip()
    if not url:
        return False
    print(f"Descargando CSV actualizado desde Google Sheets...")
    req = urllib.request.Request(url, headers={"User-Agent": "FormRecep-Sync/2.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read()
    text = raw.decode("utf-8-sig", errors="replace")
    if len(text.splitlines()) < 2:
        raise ValueError("El CSV remoto parece vacío; se conserva el CSV local.")
    CSV_PATH.write_text(text, encoding="utf-8")
    print(f"CSV local actualizado ({len(text.splitlines())} líneas).")
    return True


def main() -> int:
    remote_used = False
    try:
        remote_used = maybe_sync_remote_csv()
    except Exception as exc:
        print(f"Aviso: no se pudo sincronizar Google Sheets ({exc}). Se usará el CSV local.")

    if not CSV_PATH.exists():
        print(f"ERROR: No existe {CSV_PATH}", file=sys.stderr)
        return 1

    raw_text = CSV_PATH.read_text(encoding="utf-8-sig", errors="replace")
    first_line = raw_text.splitlines()[0] if raw_text.splitlines() else ""
    delimiter = ";" if first_line.count(";") > first_line.count(",") else ","

    reader = csv.DictReader(io.StringIO(raw_text), delimiter=delimiter)
    questions = []
    warnings = []

    for idx, row in enumerate(reader, start=1):
        norm = {str(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
        texto = pick(norm, ["texto", "text", "pregunta", "enunciado"])
        if not texto:
            continue

        activo = pick(norm, ["activo", "activa", "enabled"])
        if activo and activo.lower() not in ("1", "true", "si", "sí", "yes"):
            continue

        dto = pick(norm, ["dto", "departamento", "departamento (dto)", "dpto", "depto", "area", "área"])
        categoria = pick(norm, ["categoría", "categoria", "modulo", "módulo", "mod", "tema"])
        nivel = pick(norm, ["nivel", "level", "dificultad"])
        A = pick(norm, ["a", "opcion_a", "opción_a"])
        B = pick(norm, ["b", "opcion_b", "opción_b"])
        C = pick(norm, ["c", "opcion_c", "opción_c"])
        D = pick(norm, ["d", "opcion_d", "opción_d"])
        corr_raw = pick(norm, ["correct_letter", "correct", "correcta", "letra_correcta", "respuesta_correcta", "respuesta"])
        why = pick(norm, ["why", "explicacion", "explicación", "comentario", "nota"])
        imagen = pick(norm, ["imagen", "image", "img", "captura", "foto"])
        imagen_explicacion = pick(norm, ["imagen_explicacion", "imagen_explicación", "imagen_why", "img_why", "image_explanation", "captura_explicacion"])
        qid = pick(norm, ["id"]) or str(idx)

        corr = corr_raw.upper()
        if corr not in ("A", "B", "C", "D"):
            low = corr_raw.lower()
            if low == A.lower():
                corr = "A"
            elif low == B.lower():
                corr = "B"
            elif low == C.lower():
                corr = "C"
            elif low == D.lower():
                corr = "D"
            else:
                warnings.append(f"Fila {idx} (ID {qid}): respuesta correcta inválida '{corr_raw}', usando 'A'")
                corr = "A"

        item = {
            "id": int(qid) if qid.isdigit() else qid,
            "departamento": dto,
            "categoria": categoria,
            "nivel": nivel,
            "texto": texto,
            "A": A,
            "B": B,
            "C": C,
            "D": D,
            "correct_letter": corr,
            "why": why,
        }
        if imagen:
            item["imagen"] = imagen
        if imagen_explicacion:
            item["imagen_explicacion"] = imagen_explicacion
        questions.append(item)

    now_iso = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    payload = {"count": len(questions), "updated_at": now_iso, "questions": questions}
    js_content = (
        "// Autogenerado a partir de data/plantilla_preguntas_unica.csv\n"
        f"// Actualizado: {now_iso} ({len(questions)} preguntas)\n"
        "window.QUIZ = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n"
    )
    DATA_JS_PATH.write_text(js_content, encoding="utf-8")

    meta = {
        "updated_at": now_iso,
        "count": len(questions),
        "with_images": sum(1 for q in questions if q.get("imagen") or q.get("imagen_explicacion")),
        "source": "google_sheets_sync" if remote_used else "repository_csv",
        "departments": sorted({q["departamento"] for q in questions if q["departamento"]}),
        "modules": sorted({q["categoria"] for q in questions if q["categoria"]}),
        "levels": sorted({q["nivel"] for q in questions if q["nivel"]}),
    }
    META_JSON_PATH.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"OK · Generados data/data.js y data/meta.json con {len(questions)} preguntas activas.")
    if warnings:
        print(f"Avisos ({len(warnings)}):")
        for w in warnings[:10]:
            print("  -", w)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
