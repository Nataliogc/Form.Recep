const ALLOWED_ORIGINS = [
  "https://nataliogc.github.io",
  "https://nataliogc.github.io/Form.Recep"
];

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json"
  };
}

export async function onRequest({ request, env }) {
  const reqOrigin = request.headers.get("Origin") || "";
  const origin = ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : "https://nataliogc.github.io";

  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(origin) });
  if (request.method !== "POST") return new Response(JSON.stringify({ ok:false, error:"Use POST" }), { status:405, headers: corsHeaders(origin) });

  try {
    const body = await request.json();
    await env.RESULTS.writeDataPoint({
      blobs:   [ body.name || "", body.dept || "", body.module || "" ],
      doubles: [ Number(body.pct||0), Number(body.right||0), Number(body.wrong||0), Number(body.total||0) ],
      indexes: [ body.level || "basico" ]
    });
    return new Response(JSON.stringify({ ok:true }), { headers: corsHeaders(origin) });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), { status:400, headers: corsHeaders(origin) });
  }
}
export const onRequestPost = onRequest;
export const onRequestOptions = onRequest;
