const baseUrl = (process.env.HYDE_INFERENCE_BASE_URL ?? "https://inference.hyde.tech/v1").replace(/\/$/, "");
const apiKey = process.env.HYDE_INFERENCE_API_KEY;

if (!apiKey) {
  console.error("HYDE_INFERENCE_API_KEY is required. Export a rotated key before running this probe.");
  process.exit(1);
}

const response = await fetch(`${baseUrl}/models`, {
  headers: { Authorization: `Bearer ${apiKey}` },
  signal: AbortSignal.timeout(20_000),
});

const rateLimitHeaders = Object.fromEntries(
  [...response.headers]
    .filter(([name]) => /^(ratelimit|x-ratelimit|retry-after)/i.test(name))
    .map(([name, value]) => [name, value]),
);

if (!response.ok) {
  console.error(`Hyde model probe failed: HTTP ${response.status}`);
  console.error(await response.text());
  process.exit(1);
}

const body = await response.json();
const models = Array.isArray(body.data) ? body.data.map((model) => model.id).filter(Boolean) : [];
console.log(JSON.stringify({ status: response.status, models, rateLimitHeaders }, null, 2));
