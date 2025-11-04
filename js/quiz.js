// Cambia a tu dominio de Pages si usas otro:
const SUBMIT_URL = 'https://form-recep.pages.dev/api/submit';

let state = { questions: [], idx: 0, right: 0, wrong: 0, current: null, player: '', dept: '', moduleSlug: '', level: 'basico' };
function $(id){ return document.getElementById(id); }

async function loadPool(slug, level){
  const res = await fetch(`data/${slug}_${level}.json`, {cache:'no-store'});
  if (!res.ok) throw new Error('No se pudo cargar el pool de preguntas');
  return await res.json();
}

function renderQuestion(){
  const q = state.questions[state.idx]; state.current = q;
  $('qId').textContent = `#${state.idx+1}`; $('qText').textContent = q.text;
  const answers = $('answers'); answers.innerHTML = '';
  const letters = ['A','B','C','D'];
  q.options.forEach((opt,i)=>{
    if(!opt) return;
    const wrap = document.createElement('label'); wrap.className = 'answer';
    const input = document.createElement('input'); input.type='radio'; input.name='ans'; input.value=letters[i];
    const letter = document.createElement('span'); letter.className='letter'; letter.textContent = letters[i];
    const text = document.createElement('span'); text.textContent = opt;
    wrap.appendChild(input); wrap.appendChild(letter); wrap.appendChild(text);
    wrap.addEventListener('click', ()=> selectAnswer(letters[i]));
    answers.appendChild(wrap);
  });
  $('why').style.display='none'; $('next').disabled=true; $('finish').style.display='none';
  const progress = ((state.idx)/state.questions.length)*100;
  $('bar').style.width = progress+'%';
  $('tally').textContent = `${state.idx}/${state.questions.length} · ${state.right} aciertos · ${state.wrong} fallos · ${state.questions.length?Math.round(state.right/state.questions.length*100):0}%`;
}

function selectAnswer(letter){
  if (!$('answers').children.length) return;
  const q = state.current;
  const nodes = Array.from($('answers').children);
  const correctLetter = q.correct_letter || ['A','B','C','D'][q.options.indexOf(q.correct)];
  nodes.forEach(n=> n.classList.remove('correct','incorrect'));
  nodes.forEach(n=>{
    const input = n.querySelector('input'); if (!input) return;
    if (input.value === correctLetter) n.classList.add('correct');
    if (input.value === letter && letter !== correctLetter) n.classList.add('incorrect');
  });
  if (letter === correctLetter) { state.right++; showExplain(true); }
  else { state.wrong++; showExplain(false); }
  $('next').disabled=false; const last = state.idx >= state.questions.length-1;
  $('finish').style.display = last ? 'inline-block' : 'none';
  $('tally').textContent = `${state.idx}/${state.questions.length} · ${state.right} aciertos · ${state.wrong} fallos · ${state.questions.length?Math.round(state.right/state.questions.length*100):0}%`;
}

function showExplain(ok){
  const box = $('why'); box.className = 'explain ' + (ok?'ok':'bad'); box.style.display = 'block';
  box.innerHTML = `${ok?'<b>¡Correcto!</b>':'<b>No es correcto.</b>'} <small>${state.current.why||''}</small>`;
}

function nextQ(){ state.idx++; if (state.idx < state.questions.length) renderQuestion(); }

async function finish(){
  $('bar').style.width = '100%';
  const pct = Math.round((state.right/state.questions.length)*100);
  const box = $('finalMsg'); box.style.display='block';
  let cls='ok', title='¡Muy bien!'; if (pct < 50) { cls='bad'; title='Toca reforzar'; } else if (pct < 80) { cls='warn'; title='¡Buen trabajo!'; }
  box.className = 'finalmsg ' + cls; box.innerHTML = `<h4>${title}</h4><p>Has obtenido ${pct}% de acierto.</p>`;
  try{
    await fetch(SUBMIT_URL, {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ name: state.player, dept: state.dept, module: state.moduleSlug, level: state.level, right: state.right, wrong: state.wrong, total: state.questions.length, pct })
    });
  }catch(e){ console.error('No se pudo enviar el resultado', e); }
}

async function start(){
  const name = $('playerName').value.trim();
  const dept = $('deptSelect').value.trim();
  const catSlug = $('moduleSelect').value.trim();
  const level = $('levelSelect').value.trim() || 'basico';
  if (!name) { alert('Indica tu nombre'); return; }
  if (!dept) { alert('Selecciona un departamento'); return; }
  if (!catSlug) { alert('Selecciona un módulo'); return; }
  state = { questions:[], idx:0, right:0, wrong:0, current:null, player:name, dept, moduleSlug:catSlug, level };
  const pill = $('levelPill'); const names = { basico:'Nivel Básico 🟢', intermedio:'Nivel Intermedio 🔹', avanzado:'Nivel Avanzado 🔴' };
  pill.textContent = names[level] || level; pill.className = 'pill ' + (level||'basico');
  $('status').style.display='block'; $('status').textContent='Cargando preguntas…';
  try{
    state.questions = await loadPool(catSlug, level);
    document.getElementById('introBlock').style.display='none';
    document.getElementById('live').style.display='block';
    $('status').style.display='none';
    renderQuestion();
  }catch(err){ console.error(err); $('status').textContent='No se pudieron cargar las preguntas.'; }
}

function wire(){
  document.getElementById('startBtn').addEventListener('click', start);
  document.getElementById('exportBtn')?.addEventListener('click', ()=>{
    const pct = state.questions.length ? Math.round(state.right/state.questions.length*100) : 0;
    const row = `${state.player};${state.dept};${state.moduleSlug};${pct}%\n`;
    const blob = new Blob([`Nombre;Dept.;Módulo;Punt.\n`+row], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'resultados.csv'; a.click(); URL.revokeObjectURL(a.href);
  });
}
window.addEventListener('DOMContentLoaded', wire);
window.nextQ = nextQ; window.finish = finish;
