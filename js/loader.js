// Premium loader: Dept → Módulo → Nivel (tolerante si falta "dept")
window.QZ = { manifest: null, byDept: {}, byCat: {} };
function showStatus(msg){const el=document.getElementById("status"); if(!el) return; el.style.display=msg?"block":"none"; el.textContent=msg||"";}
async function loadManifest(){
  try{
    const res = await fetch("data/index.json",{cache:"no-store"});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const manifest = await res.json(); if(!manifest||!Object.keys(manifest).length) throw new Error("index.json vacío");
    QZ.manifest=manifest; const byDept={};
    for(const [slug,meta] of Object.entries(manifest)){
      const dept=(meta.dept&&String(meta.dept).trim())||"General";
      (byDept[dept]??=[]).push({slug, name: meta.name||slug, levels: meta.levels?Object.keys(meta.levels):["basico","intermedio","avanzado"]});
      QZ.byCat[slug]=meta;
    }
    QZ.byDept=byDept;
  }catch(e){console.error(e); showStatus("⚠️ No se pudo cargar /data/index.json"); throw e;}
}
function populateDeptSelect(){const sel=document.getElementById("deptSelect"); sel.innerHTML='<option value="">Selecciona departamento…</option>'; for(const d of Object.keys(QZ.byDept).sort((a,b)=>a.localeCompare(b,"es"))){const o=document.createElement("option"); o.value=d; o.textContent=d; sel.appendChild(o);}}
function populateModuleSelect(dept){const sel=document.getElementById("moduleSelect"); sel.innerHTML='<option value="">Selecciona módulo…</option>'; for(const m of (QZ.byDept[dept]||[]).slice().sort((a,b)=>a.name.localeCompare(b.name,"es"))){const o=document.createElement("option"); o.value=m.slug; o.textContent=m.name; sel.appendChild(o);}}
function populateLevelSelect(slug){const sel=document.getElementById("levelSelect"); const meta=QZ.byCat[slug]||{}; const allowed=meta.levels?Object.keys(meta.levels):["basico","intermedio","avanzado"]; const names={basico:"Nivel Básico 🟢",intermedio:"Nivel Intermedio 🔹",avanzado:"Nivel Avanzado 🔴"}; sel.innerHTML=""; for(const k of allowed){const o=document.createElement("option"); o.value=k; o.textContent=names[k]||k; sel.appendChild(o);}}
function wireSelectors(){const d=document.getElementById("deptSelect"), m=document.getElementById("moduleSelect"), l=document.getElementById("levelSelect"); d.addEventListener("change",()=>{populateModuleSelect(d.value); m.value=""; l.innerHTML='<option value="">Selecciona nivel…</option>';}); m.addEventListener("change",()=>{if(m.value) populateLevelSelect(m.value);});}
async function boot(){await loadManifest(); populateDeptSelect(); wireSelectors(); showStatus("");}
document.addEventListener("DOMContentLoaded", boot);
