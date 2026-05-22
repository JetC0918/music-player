import {
  isApiBusyPayload,
  isValidSearchPayload,
  normalizeSearchParams
} from "../../lib/harmonia-core.js";

const ORIGIN_API = "https://music-api.gdstudio.xyz/api.php";
const CACHE_TTL_SECONDS = 60 * 60 * 6;

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra
  };
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders({
      "Content-Type": "application/json; charset=utf-8",
      ...headers
    })
  });
}

function buildOriginUrl(searchParams) {
  const url = new URL(ORIGIN_API);
  searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return url;
}

function normalizePassthroughParams(searchParams) {
  const allowed = new Set(["types", "source", "id", "br", "size", "name", "count", "pages"]);
  const normalized = new URLSearchParams();

  searchParams.forEach((value, key) => {
    if (allowed.has(key) && value) {
      normalized.set(key, value.trim());
    }
  });

  if (!normalized.get("source")) normalized.set("source", "kuwo");
  return normalized;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet({ request }) {
  const requestUrl = new URL(request.url);
  const type = requestUrl.searchParams.get("types") || "search";

  try {
    if (type === "search") {
      return await handleSearch(request, requestUrl);
    }

    return await handlePassthrough(requestUrl);
  } catch (error) {
    return jsonResponse({ error: "Proxy request failed", detail: error.message }, 502, {
      "Cache-Control": "no-store"
    });
  }
}

async function handleSearch(request, requestUrl) {
  const normalizedParams = normalizeSearchParams(requestUrl);
  const originUrl = buildOriginUrl(normalizedParams);
  const cacheKeyUrl = new URL(request.url);

  cacheKeyUrl.pathname = "/api/search-cache";
  cacheKeyUrl.search = normalizedParams.toString();

  const cache = caches.default;
  const cacheKey = new Request(cacheKeyUrl.toString(), request);
  const cached = await cache.match(cacheKey);

  if (cached) {
    return new Response(cached.body, {
      status: cached.status,
      headers: corsHeaders({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
        "X-Harmonia-Cache": "HIT"
      })
    });
  }

  const originResponse = await fetch(originUrl.toString(), {
    headers: { "Accept": "application/json" }
  });
  const payload = await originResponse.json().catch(() => null);

  if (!originResponse.ok || !isValidSearchPayload(payload)) {
    return jsonResponse(Array.isArray(payload) ? payload : { error: "Invalid search response" }, originResponse.ok ? 200 : originResponse.status, {
      "Cache-Control": "no-store",
      "X-Harmonia-Cache": "BYPASS"
    });
  }

  const response = jsonResponse(payload, 200, {
    "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
    "X-Harmonia-Cache": "MISS"
  });

  if (!isApiBusyPayload(payload)) {
    await cache.put(cacheKey, response.clone());
  }

  return response;
}

async function handlePassthrough(requestUrl) {
  const normalizedParams = normalizePassthroughParams(requestUrl.searchParams);
  const originUrl = buildOriginUrl(normalizedParams);
  const originResponse = await fetch(originUrl.toString(), {
    headers: { "Accept": "application/json" }
  });

  const payload = await originResponse.json().catch(() => ({ error: "Invalid API response" }));

  return jsonResponse(payload, originResponse.status, {
    "Cache-Control": "no-store",
    "X-Harmonia-Cache": "BYPASS"
  });
}
