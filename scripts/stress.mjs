const defaults = { requests: 20, concurrency: 4, timeoutMs: 45_000 };

function positiveInteger(name, fallback) {
  const position = process.argv.indexOf(`--${name}`);
  if (position === -1) return fallback;
  const value = Number.parseInt(process.argv[position + 1] ?? "", 10);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`--${name} must be a positive integer.`);
  }
  return value;
}

const requests = positiveInteger("requests", defaults.requests);
const concurrency = Math.min(positiveInteger("concurrency", defaults.concurrency), requests);
const timeoutMs = positiveInteger("timeout-ms", defaults.timeoutMs);
const stopOn429 = process.argv.includes("--stop-on-429");
const baseUrl = (process.env.HYDE_INFERENCE_BASE_URL ?? "https://inference.hyde.tech/v1").replace(/\/$/, "");
const model = process.env.HYDE_INFERENCE_MODEL ?? "hyde/glm-5.3-flash";
const apiKey = process.env.HYDE_INFERENCE_API_KEY;

if (!apiKey) {
  console.error("HYDE_INFERENCE_API_KEY is required. Export a rotated key before running this test.");
  process.exit(1);
}

const latencies = [];
const statuses = new Map();
const failures = [];
let nextRequest = 0;
let rateLimitReached = false;

async function oneRequest(index) {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: `Return exactly OK. Test request ${index}.` }],
        max_tokens: 8,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const elapsedMs = performance.now() - startedAt;
    latencies.push(elapsedMs);
    statuses.set(String(response.status), (statuses.get(String(response.status)) ?? 0) + 1);
    if (stopOn429 && response.status === 429) rateLimitReached = true;
    // Consume the body so each connection can be reused; intentionally discard model text.
    await response.arrayBuffer();
  } catch (error) {
    const elapsedMs = performance.now() - startedAt;
    latencies.push(elapsedMs);
    const name = error instanceof Error ? error.name : "UnknownError";
    statuses.set(name, (statuses.get(name) ?? 0) + 1);
    failures.push({ request: index, error: name });
  }
}

async function worker() {
  while (true) {
    if (rateLimitReached) return;
    const index = nextRequest;
    nextRequest += 1;
    if (index >= requests) return;
    await oneRequest(index + 1);
  }
}

const testStartedAt = performance.now();
await Promise.all(Array.from({ length: concurrency }, worker));
const elapsedMs = performance.now() - testStartedAt;
const sortedLatencies = [...latencies].sort((a, b) => a - b);
const percentile = (fraction) => sortedLatencies[Math.min(sortedLatencies.length - 1, Math.ceil(sortedLatencies.length * fraction) - 1)];
const successful = [...statuses.entries()].filter(([status]) => /^2\d\d$/.test(status)).reduce((total, [, count]) => total + count, 0);
const attempted = latencies.length;
const failed = attempted - successful;

console.log(JSON.stringify({
  target: { baseUrl, model },
  load: { requests, concurrency, timeoutMs, stopOn429 },
  result: {
    attempted,
    notStarted: requests - attempted,
    successful,
    failed,
    statuses: Object.fromEntries([...statuses.entries()].sort(([a], [b]) => a.localeCompare(b))),
    durationMs: Math.round(elapsedMs),
    requestsPerSecond: Number((attempted / (elapsedMs / 1_000)).toFixed(2)),
    latencyMs: {
      min: Math.round(sortedLatencies[0]),
      p50: Math.round(percentile(0.5)),
      p95: Math.round(percentile(0.95)),
      max: Math.round(sortedLatencies.at(-1)),
    },
    failures,
    rateLimitReached,
  },
}, null, 2));

if (failed > 0 && !rateLimitReached) process.exitCode = 1;
