# -*- coding: utf-8 -*-
"""
Genera datos desde hoja 'Preguntas' con niveles basico/intermedio/avanzado.
Crea: data/index.json, data/<cat>_<nivel>.json, bloques y data/offline_bundle.js
"""
import os, re, json, sys, shutil, time
import pandas as pd

BASE = os.path.dirname(os.path.abspath(__file__))
XLSX = os.path.join(BASE, "plantilla_preguntas_unica.xlsx")
if "--xlsx" in sys.argv:
    i=sys.argv.index("--xlsx")
    if i+1 < len(sys.argv): XLSX = sys.argv[i+1]

OUT = os.path.join(BASE, "data")
os.makedirs(OUT, exist_ok=True)

BLOCK_SIZE = 25
REQ = ["categoria","nivel","text","A","B","C","D","correct_letter","why","source"]

def slugify(s:str)->str:
    s=(s or "").strip().lower()
    s=re.sub(r"[^\w\s-]","",s,flags=re.UNICODE)
    s=re.sub(r"[\s]+","_",s)
    return s

def norm_level(x:str)->str:
    x=(x or "").strip().lower()
    if x in ("facil","fácil","easy","basico","básico"): return "basico"
    if x in ("medio","medium","intermedio"): return "intermedio"
    if x in ("dificil","difícil","hard","avanzado"): return "avanzado"
    return "basico"

def clean_opt(x):
    if pd.isna(x): return ""
    s = str(x).strip()
    return "" if s.lower() in ("nan","none","null") else s

def safe_read_excel(path):
    try:
        return pd.read_excel(path, sheet_name="Preguntas")
    except PermissionError:
        tmp = os.path.join(OUT, "_tmp_read.xlsx")
        for _ in range(5):
            try:
                shutil.copy2(path, tmp)
                return pd.read_excel(tmp, sheet_name="Preguntas")
            except PermissionError:
                time.sleep(0.8)
        raise

if not os.path.isfile(XLSX):
    raise SystemExit(f"No encuentro el Excel: {XLSX}")

df = safe_read_excel(XLSX)
df.columns=[str(c).strip() for c in df.columns]
for col in REQ+["id","activo"]:
    if col not in df.columns: df[col]=""

df = df[df["text"].astype(str).str.strip().ne("")].copy()
if "activo" in df.columns:
    df = df[df["activo"].apply(lambda x: str(x).strip() not in ("0","false","False","FALSE","0.0"))]

issues=[]; valids=[]
for i,r in df.iterrows():
    row=i+2
    missing=[c for c in REQ if not str(r.get(c,"")).strip()]
    letter=str(r.get("correct_letter","")).strip().upper()
    opts=[clean_opt(r.get("A","")),clean_opt(r.get("B","")),clean_opt(r.get("C","")),clean_opt(r.get("D",""))]
    if missing:
        issues.append((row,"datos",f"Campos vacíos: {', '.join(missing)}")); continue
    if letter not in ("A","B","C","D"):
        issues.append((row,"letra","correct_letter debe ser A/B/C/D")); continue
    idx={"A":0,"B":1,"C":2,"D":3}[letter]
    if not opts[idx]:
        issues.append((row,"coherencia","La letra correcta apunta a una opción vacía")); continue
    r = r.copy()
    r["A"],r["B"],r["C"],r["D"] = opts
    valids.append(r)

index_manifest, POOLS, BLOCKS = {}, {}, {}
if valids:
    vdf=pd.DataFrame(valids)
    for cat,gcat in vdf.groupby("categoria"):
        cat_name = str(cat).strip() or "General"
        cat_slug = slugify(cat_name)
        for lvl,glvl in gcat.groupby("nivel"):
            lvl_slug = norm_level(lvl)
            pool=[]
            for j,rr in glvl.reset_index(drop=True).iterrows():
                options=[clean_opt(rr["A"]),clean_opt(rr["B"]),clean_opt(rr["C"]),clean_opt(rr["D"])]
                idx={"A":0,"B":1,"C":2,"D":3}[str(rr["correct_letter"]).strip().upper()]
                qid = str(rr.get("id","")).strip() or f"{cat_slug}-{lvl_slug}-{j+2}"
                pool.append({
                    "id": qid,
                    "categoria": cat_name,
                    "level": lvl_slug,
                    "text": str(rr["text"]).strip(),
                    "options": options,
                    "correct": options[idx],
                    "correct_letter": str(rr["correct_letter"]).strip().upper(),
                    "why": str(rr["why"]).strip(),
                    "source": str(rr["source"]).strip()
                })
            # agregada
            agg=f"{cat_slug}_{lvl_slug}.json"
            with open(os.path.join(OUT, agg),"w",encoding="utf-8") as f: json.dump(pool,f,ensure_ascii=False,indent=2)
            POOLS[f"{cat_slug}_{lvl_slug}"]=pool
            # bloques
            blocks_dir=os.path.join(OUT, cat_slug, "blocks", lvl_slug)
            os.makedirs(blocks_dir, exist_ok=True)
            nblocks=(len(pool)+BLOCK_SIZE-1)//BLOCK_SIZE
            for b in range(nblocks):
                chunk=pool[b*BLOCK_SIZE:(b+1)*BLOCK_SIZE]
                bname=f"block_{b+1:02d}.json"
                with open(os.path.join(blocks_dir,bname),"w",encoding="utf-8") as fb: json.dump(chunk, fb, ensure_ascii=False, indent=2)
                BLOCKS[f"{cat_slug}/blocks/{lvl_slug}/{bname}"]=chunk
            index_manifest.setdefault(cat_slug,{"name":cat_name})
            index_manifest[cat_slug].setdefault("levels",{})[lvl_slug]={
                "agg": agg,
                "blocks_dir": f"{cat_slug}/blocks/{lvl_slug}/",
                "count": len(pool),
                "block_size": BLOCK_SIZE
            }

# Salidas
with open(os.path.join(OUT,"index.json"),"w",encoding="utf-8") as f:
    json.dump(index_manifest,f,ensure_ascii=False,indent=2)

with open(os.path.join(OUT,"offline_bundle.js"),"w",encoding="utf-8") as f:
    f.write("window.QUIZ_INDEX="+json.dumps(index_manifest,ensure_ascii=False)+";\n")
    f.write("window.QUIZ_POOLS="+json.dumps(POOLS,ensure_ascii=False)+";\n")
    f.write("window.QUIZ_BLOCKS="+json.dumps(BLOCKS,ensure_ascii=False)+";\n")

print("[OK] Generado data/index.json y data/offline_bundle.js")
print("[INFO] Módulos:", ", ".join(index_manifest.keys()) or "(ninguno)")
print("[INFO] Incidencias:", len(issues))
