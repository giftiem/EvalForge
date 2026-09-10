const ALLOWED_OPERATIONS = new Set(["generate", "evaluate", "analyze", "recommend"]);

export default async (request, context) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  const operation = context.params.operation;
  if (!operation || !ALLOWED_OPERATIONS.has(operation)) {
    return Response.json({ error: "Unknown EvalForge operation" }, { status: 404 });
  }

  const baseUrl = process.env.EVALFORGE_SERVICE_BASE_URL?.trim().replace(/\/$/, "");
  if (!baseUrl) {
    console.error("EVALFORGE_SERVICE_BASE_URL is not configured");
    return Response.json({ error: "EvalForge service is not configured" }, { status: 500 });
  }

  let upstreamUrl;
  try {
    upstreamUrl = new URL(`${baseUrl}/${operation}`);
  } catch {
    console.error("EVALFORGE_SERVICE_BASE_URL is invalid");
    return Response.json({ error: "EvalForge service is not configured correctly" }, { status: 500 });
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: await request.text(),
    });

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: { "Content-Type": upstreamResponse.headers.get("Content-Type") || "application/json" },
    });
  } catch (error) {
    console.error("EvalForge upstream request failed", error);
    return Response.json({ error: "The EvalForge service could not be reached" }, { status: 502 });
  }
};

export const config = {
  path: "/api/evalforge/:operation",
};
