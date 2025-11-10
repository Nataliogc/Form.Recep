(function(){
  const RAW = window.QUIZ || {questions:[]};

  // Normaliza columnas (acepta alias) y convierte correcta texto->letra
  function normalizeQuestion(q, i){
    const get = (keys) => { for(const k of keys){ if(q[k]!=null && String(q[k]).trim()!=="") return String(q[k]).trim(); } return ""; };
    const id  = q.id ?? i;
    const departamento = get(['departamento','Departamento','depto','dto','area','área','Area','Departamento / Área','Departamento/Área','seccion','sección','Sección']);
    const categoria    = get(['categoría','categoria','Categoria']);
    const nivel        = get(['nivel','Nivel']);
    const texto        = get(['texto','pregunta','enunciado','Texto']);
    const A            = get(['A','a','opcion_a','opción_a','opción A']);
    const B            = get(['B','b','opcion_b','opción_b','opción B']);
    const C            = get(['C','c','opcion_c','opción_c','opción C']);
    const D            = get(['D','d','opcion_d','opción_d','opción D']);
    let correctLetter  = get(['correct_letter','correcta','letra_correcta','respuesta_correcta','correct','Respuesta']);
    const why          = get(['why','explicacion','explicación','comentario']);
    const toLetter = (t)=>{
      const tt=(t||"").toLowerCase().trim();
      if(!tt) return "";
      if(tt === (A||"").toLowerCase().trim()) return "A";
      if(tt === (B||"").toLowerCase().trim()) return "B";
      if(tt === (C||"").toLowerCase().trim()) return "C";
      if(tt === (D||"").toLowerCase().trim()) return "D";
      if (/^[ABCD]$/i.test(tt)) return tt.toUpperCase();
      return "";
    };
    if(correctLetter && !/^[ABCD]$/i.test(correctLetter)) correctLetter = toLetter(correctLetter);
    if(!correctLetter) correctLetter = "A"; // fallback
    return { id, departamento, categoria, nivel, texto, A, B, C, D, correct_letter: correctLetter.toUpperCase(), why };
  }

  let all = (RAW.questions||[]).map(normalizeQuestion).filter(q => q.texto);

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const qCount=$("#qCount"), filterDepto=$("#filterDepto"), filterNivel=$("#filterNivel"), searchText=$("#searchText");
  const card=$("#quizCard"), empty=$("#empty"), qIndex=$("#qIndex"), qTags=$("#qTags"), qText=$("#qText"), answers=$("#answers");
  const whyBox=$("#whyBox"), explain=$("#explain"), btnPrev=$("#btnPrev"), btnNext=$("#btnNext"), summary=$("#summary");
  const okEl=$("#ok"), koEl=$("#ko"), totalEl=$("#total"), btnReview=$("#btnReview"), btnAgain=$("#btnAgain"), btnReset=$("#btnReset"), btnShuffle=$("#btnShuffle");
  const progressBar=$("#progressBar"), progressLabel=$("#progressLabel");

  let filtered=[...all], idx=0, correct=new Set(), wrong=new Set();
  const uniq=arr=>[...new Set(arr.filter(Boolean))];
  const norm=s=>(s||'').toString().toLowerCase();

  function setProgress(){
    const pct=filtered.length?((idx+1)/filtered.length)*100:0;
    progressBar.style.width=pct.toFixed(1)+"%";
    progressLabel.textContent=Math.round(pct)+"%";
  }

  function applyFilters(){
    const depto=filterDepto.value||"";
    const nv=filterNivel.value||"";
    const q=norm(searchText.value);
    filtered = all.filter(x=>{
      const ok1 = depto ? (x.departamento===depto) : true;
      const ok2 = nv    ? (x.nivel===nv) : true;
      const blob=[x.texto,x.A,x.B,x.C,x.D,x.why,x.categoria,x.departamento,x.nivel].join(" ").toLowerCase();
      const ok3 = q ? blob.includes(q) : true;
      return ok1 && ok2 && ok3;
    });
    idx=0; correct.clear(); wrong.clear();
    renderState();
  }

  function renderState(){
    qCount.textContent = `${filtered.length} preguntas`;
    totalEl.textContent = filtered.length;
    if(!filtered.length){
      card.classList.add("hidden"); summary.classList.add("hidden"); empty.classList.remove("hidden");
      progressBar.style.width="0%"; progressLabel.textContent="0%";
      return;
    }
    empty.classList.add("hidden"); summary.classList.add("hidden"); card.classList.remove("hidden");
    render();
  }

  function render(){
    const q=filtered[idx];
    setProgress();
    qIndex.textContent=`Pregunta ${idx+1}/${filtered.length}`;
    qTags.textContent=[q.departamento,q.categoria,q.nivel].filter(Boolean).join(" · ");
    qText.textContent=q.texto;
    whyBox.classList.add("hidden");
    explain.textContent=q.why||"";
    answers.innerHTML="";
    ["A","B","C","D"].forEach(letter=>{
      if(!q[letter]) return;
      const div=document.createElement("div");
      div.className="answer";
      div.dataset.letter=letter;
      div.innerHTML=`<b>${letter}.</b> ${q[letter]}`;
      div.onclick=()=>onPick(letter,q.correct_letter);
      answers.appendChild(div);
    });
  }

  function onPick(letter, correctLetter){
    const list=$$(".answer");
    list.forEach(el=>el.onclick=null);
    list.forEach(el=>{ if(el.dataset.letter===correctLetter) el.classList.add("correct"); });
    if(letter===correctLetter){
      correct.add(filtered[idx].id ?? idx);
    } else {
      wrong.add(filtered[idx].id ?? idx);
      list.find(el=>el.dataset.letter===letter)?.classList.add("wrong");
    }
    if(explain.textContent.trim()) { whyBox.classList.remove("hidden"); }
  }

  function next(){ if(idx<filtered.length-1){ idx++; render(); } else { showSummary(); } }
  function prev(){ if(idx>0){ idx--; render(); } }

  function showSummary(){
    card.classList.add("hidden");
    summary.classList.remove("hidden");
    okEl.textContent=correct.size;
    koEl.textContent=wrong.size;
  }

  function reviewWrong(){
    const set=new Set([...wrong]);
    filtered = filtered.filter((q,i)=> set.has(q.id ?? i));
    idx=0; correct.clear(); wrong.clear();
    renderState();
  }

  function resetAll(){
    filterDepto.value=""; filterNivel.value=""; searchText.value="";
    filtered=[...all]; idx=0; correct.clear(); wrong.clear();
    renderState();
  }

  function shuffle(){
    for(let i=all.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [all[i],all[j]]=[all[j],all[i]];
    }
    resetAll();
  }

  uniq(all.map(q=>q.departamento)).sort().forEach(v=>{
    const opt=document.createElement("option");
    opt.value=v; opt.textContent=v;
    filterDepto.appendChild(opt);
  });

  filterDepto.onchange=applyFilters;
  filterNivel.onchange=applyFilters;
  searchText.oninput=applyFilters;
  btnNext.onclick=next; btnPrev.onclick=prev;
  btnReview.onclick=reviewWrong; btnAgain.onclick=resetAll;
  btnReset.onclick=resetAll; btnShuffle.onclick=shuffle;

  renderState();
})();
