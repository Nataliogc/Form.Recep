const $=(s)=>document.querySelector(s), $$=(s)=>Array.from(document.querySelectorAll(s));
let S={name:"", cat:"", level:"basico", qs:[], i:0, c:0, w:0, answered:false};

// === Worker / GitHub (TU URL real) ===
const REMOTE_BASE        = "https://formrecep-worker.comunicaciones-d2b.workers.dev";
const REMOTE_RESULTS_URL = `${REMOTE_BASE}/results`;
const REMOTE_SUBMIT_URL  = `${REMOTE_BASE}/submit`;
// Fallback público por si el worker no responde
const PUBLIC_RESULTS_RAW = "https://raw.githubusercontent.com/Nataliogc/Form.Recep/main/data/results.json";

const niceLevel = (k)=> k==='basico'?'Nivel Básico 🟢' : k==='intermedio'?'Nivel Intermedio 🔹' : 'Nivel Avanzado 🔴';
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const LETTERS=["A","B","C","D"];
const cleanOpt = s => (s==null?"":String(s).trim()).replace(/^(nan|none|null)$/i,"");

async function initUI(){
  const saved=localStorage.getItem('quiz_player_name'); if(saved){S.name=saved; $('#playerName').value=saved;}
  const idx=await loadIndex();
  const modSel=$('#moduleSelect'); modSel.innerHTML='<option value="">Selecciona módulo…</option>';
  if(Object.keys(idx).length===0){
    modSel.innerHTML+='<option value="" disabled>(Aún no hay módulos: genera datos)</option>';
  }else{
    for(const catSlug of Object.keys(idx)){
      const name=idx[catSlug]?.name||catSlug;
      modSel.innerHTML+=`<option value="${catSlug}">${name}</option>`;
    }
  }
  modSel.addEventListener('change', e=>{ S.cat=e.target.value; refreshLB(); });
  $('#levelSelect').addEventListener('change', e=>{ S.level=e.target.value; updatePill(); refreshLB(); });
  $('#playerName').addEventListener('input', e=> S.name=e.target.value.trim());
  $('#startBtn').addEventListener('click', start);
  $('#exportBtn').addEventListener('click', exportCSV);
  updatePill(); refreshLB(); renderResume();
}

function updatePill(){
  const pill=$('#levelPill');
  pill.classList.remove('basico','intermedio','avanzado');
  pill.classList.add(S.level);
  pill.textContent = niceLevel(S.level);
}

function upd(){
  const t=S.qs.length||1;
  $('#bar').style.width=Math.round(S.i/t*100)+'%';
  const pct = S.i ? Math.round((S.c/S.i)*100) : 0;
  $('#tally').textContent=`${S.i}/${t} · ${S.c} aciertos · ${S.w} fallos · ${pct}%`;
}

function render(){
  const q=S.qs[S.i]; if(!q) return;
  $('#finalMsg').style.display='none'; $('#finalMsg').className='finalmsg';
  $('#qId').textContent = `#${q.id || "-"}`;
  $('#qText').textContent = q.text;

  const A=$('#answers'); A.innerHTML='';
  (q.options||[]).map(cleanOpt).forEach((opt,idx)=>{
    if(!opt) return;
    const L=document.createElement('label');
    L.className='answer';
    L.innerHTML = `
      <input type="radio" name="ans">
      <span class="letter">${LETTERS[idx]||""}</span>
      <div>${opt}</div>
    `;
    L.onclick=()=>sel(opt,q);
    A.appendChild(L);
  });

  const why=$('#why'); why.style.display='none'; why.className='explain';
  $('#next').disabled=true;
  $('#finish').style.display = (S.i>=S.qs.length-1)?'inline-block':'none';
  upd();
}

function sel(opt,q){
  if(S.answered) return;
  S.answered=true;
  const ok=(opt===q.correct);
  if(ok) S.c++; else S.w++;

  $$('#answers .answer').forEach(l=>{
    const t=l.innerText.replace(/^[A-D]\s*/,'').trim();
    if(t===q.correct) l.classList.add('correct'); else l.classList.add('incorrect');
  });

  // Explicación SIEMPRE visible + Fuente
  const why=$('#why');
  why.className='explain ' + (ok?'ok':'bad');
  const fuente = q.source && q.source.trim() ? q.source.trim() : 'sin especificar';
  const texto  = q.why && q.why.trim() ? q.why.trim() : (ok ? 'Correcto.' : 'Respuesta incorrecta.');
  why.innerHTML = `${texto}<small><b>Fuente:</b> ${fuente}</small>`;
  why.style.display='block';

  const last=S.i>=S.qs.length-1;
  $('#next').disabled=last;
  $('#finish').style.display = last ? 'inline-block' : 'none';
  upd();
}

function nextQ(){ if(!S.answered){alert('Selecciona una respuesta');return;} S.i++; S.answered=false; render(); }

/* ===== Guardado y lectura REMOTOS ===== */
async function remoteReadAll(){
  try{
    const r = await fetch(REMOTE_RESULTS_URL, {cache:'no-store'});
    const j = await r.json();
    if (j && j.ok && Array.isArray(j.data)) return j.data;
  }catch(_){}
  try{
    const r = await fetch(PUBLIC_RESULTS_RAW, {cache:'no-store'});
    if (r.ok) return await r.json();
  }catch(_){}
  return [];
}
async function remoteAppend(entry){
  try{
    const r = await fetch(REMOTE_SUBMIT_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(entry)
    });
    const j = await r.json();
    return !!(j && j.ok);
  }catch(_){
    return false;
  }
}

/* ===== Mensaje final bonito + remoto ===== */
function finish(){
  const total = S.qs.length || 1;
  const pct   = Math.round((S.c/total)*100);

  const entry={name:S.name,module:S.cat,level:S.level,score:pct,correct:S.c,wrong:S.w,date:new Date().toISOString()};

  // Enviar al backend (no bloquea UI si falla)
  remoteAppend(entry).then(ok=>{
    if(!ok) console.warn("No se pudo guardar en remoto.");
    refreshLB();    // recarga ranking remoto
    renderResume(); // recarga resumen remoto
  });

  let msgHTML="", tipo="warn";
  if(pct < 50){
    tipo="bad";
    msgHTML = `
      <h4>Necesitas mejorar un poco más 💡</h4>
      <p>Tranquilo, esto no es un examen — es una oportunidad para reforzar conocimientos.<br>
      Repasa el módulo con calma, pregunta cualquier duda y verás cómo cada intento te acerca a la excelencia.</p>
    `;
  } else if(pct < 95){
    tipo="warn";
    msgHTML = `
      <h4>¡Vas por muy buen camino! 🚀</h4>
      <p>Aún hay detalles que puedes pulir, pero tu progreso es evidente.<br>
      Con un poco más de práctica dominarás completamente este módulo.</p>
    `;
  } else if(pct >= 96){
    tipo="ok";
    msgHTML = `
      <h4>¡Enhorabuena! 🌟</h4>
      <p>Tu resultado refleja un gran compromiso y dominio del trabajo diario.<br>
      Gracias por tu esfuerzo y por contribuir a la excelencia de nuestros hoteles.</p>
    `;
  } else {
    tipo="warn";
    msgHTML = `
      <h4>Resultado excelente 👏</h4>
      <p>Estás a las puertas de la excelencia. Un repaso final y lo tienes.</p>
    `;
  }

  const box=$('#finalMsg');
  box.className='finalmsg '+(tipo==='ok'?'ok':tipo==='bad'?'bad':'warn');
  box.innerHTML = `
    <div><b>Resultado:</b> ${pct}% · ${S.c}/${total} aciertos</div>
    <div style="height:10px"></div>
    ${msgHTML}
  `;
  box.style.display='block';
  $('#finish').style.display='none';
}

/* Portada: ocultarla al empezar */
function hideIntro(){ const b=$('#introBlock'); if(b) b.style.display='none'; }

async function start(){
  if(!S.name){alert('Debes escribir tu nombre');return;}
  if(!S.cat){alert('Selecciona un módulo');return;}
  localStorage.setItem('quiz_player_name', S.name);

  try{
    const pool=await loadPool(S.cat,S.level);
    S.qs=shuffle([...pool]);
  }catch(e){ alert('No se pudo cargar preguntas.\n\n'+e.message); return; }

  hideIntro();
  S.i=0; S.c=0; S.w=0; S.answered=false;
  $('#live').style.display='block'; render(); upd();
}

/* Ranking / resumen (remotos) */
async function refreshLB(){
  const body=$('#lbBody');
  const arr=await remoteReadAll();
  const filtered = arr
    .filter(r => (!S.cat || r.module===S.cat) && (!S.level || r.level===S.level))
    .sort((a,b)=> b.score-a.score || new Date(a.date)-new Date(b.date))
    .slice(0,50);
  if(!filtered.length){
    body.innerHTML=`<tr><td colspan="5" class="muted">Sin resultados todavía.</td></tr>`;
    return;
  }
  body.innerHTML = filtered.map((r,i)=>{ const d=new Date(r.date).toLocaleString('es-ES'); return `<tr><td>${i+1}</td><td>${r.name}</td><td>${r.module}</td><td><b>${r.score}</b></td><td class="muted">${d}</td></tr>`; }).join('');
}

async function renderResume(){
  const arr=await remoteReadAll();
  const tbody=$('#resumeBody'); if(!tbody) return;
  if(!arr.length){ tbody.innerHTML=`<tr><td colspan="5" class="muted">Sin participaciones aún.</td></tr>`; return; }
  const ordered = arr.sort((a,b)=> new Date(a.date)-new Date(b.date));
  tbody.innerHTML = ordered.map((r,i)=>{ const d=new Date(r.date).toLocaleString('es-ES'); return `<tr><td>${i+1}</td><td>${r.name}</td><td>${r.module}</td><td>${r.score}</td><td class="muted">${d}</td></tr>`; }).join('');
}

function exportCSV(){ /* mantiene export local desde memoria remota */
  remoteReadAll().then(arr=>{
    const header=['Nombre','Módulo','Nivel','Puntuación','Aciertos','Fallos','Fecha'];
    const rows=arr.map(r=>[r.name,r.module||'',r.level,r.score,r.correct??'',r.wrong??'',new Date(r.date).toLocaleString('es-ES')]);
    const csv=header.join(';')+'\n'+rows.map(r=>r.join(';')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='resultados_quiz.csv'; a.click();
  });
}

document.addEventListener('DOMContentLoaded', initUI);
