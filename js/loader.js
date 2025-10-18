async function fetchJSON(url){
  const res = await fetch(url, {cache:'no-store'});
  if(!res.ok) throw new Error(`HTTP ${res.status} al cargar ${url}`);
  return await res.json();
}
function injectScript(src){
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=src + '?' + Date.now();
    s.onload=()=>resolve(); s.onerror=()=>reject(new Error('No se pudo cargar '+src));
    document.head.appendChild(s);
  });
}
let OFFLINE=false;
async function loadIndex(){
  try{
    const idx = await fetchJSON('data/index.json');
    if(!idx || typeof idx!=='object' || !Object.keys(idx).length) throw new Error('index.json vacío');
    return idx;
  }catch(e){
    try{
      await injectScript('data/offline_bundle.js');
      if(window.QUIZ_INDEX && Object.keys(window.QUIZ_INDEX).length){
        OFFLINE=true; return window.QUIZ_INDEX;
      }
      throw new Error('offline_bundle.js sin QUIZ_INDEX');
    }catch(e2){
      const el=document.querySelector('#status');
      if(el){ el.style.display='block'; el.textContent='⚠️ No se pudo cargar data/index.json ni offline_bundle.js'; }
      return {};
    }
  }
}
async function loadPool(catSlug, levelSlug){
  if(OFFLINE && window.QUIZ_POOLS){
    const key=`${catSlug}_${levelSlug}`;
    if(window.QUIZ_POOLS[key]) return window.QUIZ_POOLS[key];
  }
  return await fetchJSON(`data/${catSlug}_${levelSlug}.json`);
}
async function loadBlock(catSlug, levelSlug, blockName){
  if(OFFLINE && window.QUIZ_BLOCKS){
    const key=`${catSlug}/blocks/${levelSlug}/${blockName}`;
    if(window.QUIZ_BLOCKS[key]) return window.QUIZ_BLOCKS[key];
  }
  return await fetchJSON(`data/${catSlug}/blocks/${levelSlug}/${blockName}`);
}
