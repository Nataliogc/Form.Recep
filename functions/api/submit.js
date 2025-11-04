// functions/api/submit.js

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "content-type": "application/json",
};

export const onRequestOptions = async () => new Response(null, { headers: cors });

export const onRequestPost = async ({ request, env }) => {
  try {
    const data = await request.json();
    const payload = {
      name: String(data?.name || ""),
      dept: String(data?.dept || ""),
      module: String(data?.module || ""),
      level: String(data?.level || ""),
      right: Number(data?.right || 0),
      wrong: Number(data?.wrong || 0),
      total: Number(data?.total || 0),
      pct: Number(data?.pct || 0),
      ts: new Date().toISOString(),
    };

    // Guardado opcional en KV (Pages → Settings → Functions → KV bindings: RESULTS)
    if (env.RESULTS && typeof env.RESULTS.put === "function") {
      const key = `result:${payload.ts}:${crypto.randomUUID()}`;
      await env.RESULTS.put(key, JSON.stringify(payload));
    }

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      headers: cors,
      status: 400,
    });
  }
};
