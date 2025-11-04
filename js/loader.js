// Premium loader: Dept → Módulo → Nivel (tolerante si falta 'dept')
window.QZ = { manifest: null, byDept: {}, byCat: {} };

function showStatus(msg){
  const el = document.getElementById('status');
  if (!el) return;
  el.style.display = msg ? 'block' : 'none';
  el.textContent = msg || '';
}

async function loadManifest() {
  try{
    const res = await fetch('data/index.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} al cargar data/index.json`);
    const manifest = await res.json();
    if (!manifest || typeof manifest !== 'object' || !Object.keys(manifest).length){
      throw new Error('data/index.json vacío o con formato incorrecto');
    }
    QZ.manifest = manifest;

    const byDept = {};
    for (const [slug, meta] of Object.entries(manifest)) {
      const dept = (meta.dept && String(meta.dept).trim()) || 'General';
      (byDept[dept] ??= []).push({
        slug,
        name: meta.name || slug,
        levels: meta.levels ? Object.keys(meta.levels) : ['basico','intermedio','avanzado']
      });
      QZ.byCat[slug] = meta;
    }
    QZ.byDept = byDept;
  } catch (e){
    console.error(e);
    showStatus('⚠️ No se pudo cargar el índice. Comprueba /data/index.json');
    throw e;
  }
}

function populateDeptSelect() {
  const sel = document.getElementById('deptSelect');
  sel.innerHTML = '<option value="">Selecciona departamento…</option>';
  const depts = Object.keys(QZ.byDept).sort((a, b) => a.localeCompare(b, 'es'));
  for (const d of depts) {
    const o = document.createElement('option');
    o.value = d; o.textContent = d; sel.appendChild(o);
  }
}

function populateModuleSelect(dept) {
  const sel = document.getElementById('moduleSelect');
  sel.innerHTML = '<option value="">Selecciona módulo…</option>';
  const items = (QZ.byDept[dept] || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
  for (const m of items) {
    const o = document.createElement('option');
    o.value = m.slug; o.textContent = m.name; sel.appendChild(o);
  }
}

function populateLevelSelect(slug) {
  const sel = document.getElementById('levelSelect');
  const meta = QZ.byCat[slug] || {};
  const allowed = meta.levels ? Object.keys(meta.levels) : ['basico','intermedio','avanzado'];
  const names = { basico: 'Nivel Básico 🟢', intermedio: 'Nivel Intermedio 🔹', avanzado: 'Nivel Avanzado 🔴' };
  sel.innerHTML = '';
  for (const key of allowed) {
    const o = document.createElement('option');
    o.value = key; o.textContent = names[key] || key; sel.appendChild(o);
  }
}

function wireSelectors() {
  const deptSel = document.getElementById('deptSelect');
  const modSel  = document.getElementById('moduleSelect');
  const lvlSel  = document.getElementById('levelSelect');

  deptSel.addEventListener('change', () => {
    populateModuleSelect(deptSel.value);
    modSel.value = '';
    lvlSel.innerHTML = '<option value="">Selecciona nivel…</option>';
  });

  modSel.addEventListener('change', () => {
    if (modSel.value) populateLevelSelect(modSel.value);
  });
}

async function boot(){ await loadManifest(); populateDeptSelect(); wireSelectors(); showStatus(''); }
document.addEventListener('DOMContentLoaded', boot);
