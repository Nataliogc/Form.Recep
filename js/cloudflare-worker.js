export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    const OWNER = env.REPO_OWNER || "Nataliogc";
    const REPO  = env.REPO_NAME  || "Form.Recep";
    const PATH  = env.RESULTS_PATH || "data/results.json";
    const GITHUB_TOKEN = env.GITHUB_TOKEN;

    const json = (data, status=200) => new Response(JSON.stringify(data), {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "GET,POST,OPTIONS"
      }
    });

    if (method === "OPTIONS") return json({ok:true});

    if (method === "GET" && url.pathname === "/results") {
      const res = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${PATH}`, { cf: { cacheTtl: 30 } });
      if (!res.ok) return json({ok:false, error:"No se pudo leer results.json"}, 500);
      const text = await res.text();
      try { return json({ok:true, data: JSON.parse(text || "[]")}); }
      catch { return json({ok:false, error:"JSON inválido en results.json"}, 500); }
    }

    if (method === "POST" && url.pathname === "/submit") {
      if (!GITHUB_TOKEN) return json({ok:false, error:"Falta GITHUB_TOKEN"}, 500);
      let payload={}; try{ payload=await request.json(); }catch{ return json({ok:false,error:"JSON inválido"},400); }
      const { name, module: moduleName, level, score, correct, wrong, date } = payload || {};
      if (!name || !moduleName || !level || typeof score!=="number") return json({ok:false,error:"Campos obligatorios: name, module, level, score"},400);

      const getRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`, {
        headers: { "Authorization": `Bearer ${GITHUB_TOKEN}`, "Accept": "application/vnd.github+json" }
      });

      let current=[], sha=undefined;
      if (getRes.status === 200) {
        const info = await getRes.json(); sha = info.sha;
        try { current = JSON.parse(atob(info.content.replace(/\n/g,"")) || "[]"); } catch { current=[]; }
      } else if (getRes.status !== 404) {
        return json({ok:false, error:`Error leyendo contenido: ${getRes.status}`}, 500);
      }

      current.push({ name, module: moduleName, level, score, correct: correct??null, wrong: wrong??null, date: date||new Date().toISOString() });

      const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(current, null, 2))));
      const body = { message: `Add result (${name} · ${moduleName} · ${level} · ${score}%)`, content: newContent, branch: "main" };
      if (sha) body.sha = sha;

      const putRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${GITHUB_TOKEN}`, "Accept": "application/vnd.github+json", "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!putRes.ok) return json({ok:false, error:`Error guardando en GitHub: ${putRes.status}`}, 500);
      return json({ok:true});
    }

    return new Response("OK", { status: 200 });
  }
}
