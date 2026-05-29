const NEWS_CACHE_TTL_SECONDS = 60 * 20;

function jsonResponse(payload, headers = {}) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

async function fetchGdeltHeadlines(query) {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", "8");
  url.searchParams.set("sort", "hybridrel");
  url.searchParams.set("timespan", "24h");

  const response = await fetch(url.toString(), {
    headers: { "Accept": "application/json" }
  });
  const payload = await response.json().catch(() => ({}));

  return (payload.articles || [])
    .map((item) => item.title)
    .filter(Boolean)
    .slice(0, 5);
}

function fallbackScript(malaysia, world) {
  const malaysiaLines = malaysia.length ? malaysia : ["Malaysia headlines are still loading."];
  const worldLines = world.length ? world : ["International headlines are still loading."];

  return [
    "This is your Harmonia ninety second news break.",
    "Malaysia first.",
    ...malaysiaLines.map((line) => `In Malaysia: ${line}.`),
    "Around the world.",
    ...worldLines.map((line) => `Internationally: ${line}.`),
    "That is the latest brief. Now back to the music."
  ].join(" ");
}

async function aiScript(env, malaysia, world) {
  if (!env?.AI) return fallbackScript(malaysia, world);

  const prompt = [
    "Prepare a calm 90 second radio news script.",
    "Start with Malaysia local news, then international news.",
    "Use concise neutral language. No fake facts. If headlines are thin, say so.",
    "",
    "Malaysia headlines:",
    ...malaysia.map((line) => `- ${line}`),
    "",
    "International headlines:",
    ...world.map((line) => `- ${line}`)
  ].join("\n");

  const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: "You are a careful radio news editor for a music station." },
      { role: "user", content: prompt }
    ]
  });

  return result?.response || fallbackScript(malaysia, world);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

export async function onRequestGet({ request, env }) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/api/news-cache", request.url).toString(), request);
  const cached = await cache.match(cacheKey);

  if (cached) return cached;

  const [malaysia, world] = await Promise.all([
    fetchGdeltHeadlines("(Malaysia OR Kuala Lumpur OR Sabah OR Sarawak)"),
    fetchGdeltHeadlines("(world OR international OR economy OR climate OR technology)")
  ]);
  const script = await aiScript(env, malaysia, world);
  const response = jsonResponse({
    generatedAt: new Date().toISOString(),
    durationSeconds: 90,
    malaysia,
    world,
    script
  }, {
    "Cache-Control": `public, max-age=${NEWS_CACHE_TTL_SECONDS}`
  });

  await cache.put(cacheKey, response.clone());
  return response;
}
