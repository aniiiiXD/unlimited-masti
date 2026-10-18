# Hyde Inference agent harness

A small [Eve](https://eve.dev) agent that calls the Hyde Inference
OpenAI-compatible API and exercises native tool-calling with two read-only,
workspace-confined tools.

## Setup

Use a newly rotated Hyde key; never commit one.

```zsh
cd /Users/anixd/Documents/Hyde/hyde-inference-harness
export HYDE_INFERENCE_API_KEY='your-rotated-key'
npm run probe
npm run dev
```

`probe` calls `GET /v1/models` only. It does not submit an inference prompt.
`dev` opens Eve's local TUI. Try: `List the source files, then summarize the
agent configuration.` The model should call the read-only tools as needed.

## Controlled load test

This sends billable, minimal chat-completion requests. Defaults are intentionally
bounded (20 requests, four concurrent, eight output tokens):

```zsh
npm run stress
# Optional: npm run stress -- --requests 40 --concurrency 8
# Stop at the first 429: npm run stress -- --requests 256 --concurrency 32 --stop-on-429
```

The report includes success/error counts, HTTP status distribution, and p50/p95
latency. It never prints the API key or response text.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `HYDE_INFERENCE_API_KEY` | none | Required API key; kept out of the repo. |
| `HYDE_INFERENCE_BASE_URL` | `https://inference.hyde.tech/v1` | OpenAI-compatible endpoint. |
| `HYDE_INFERENCE_MODEL` | `hyde/glm-5.3-flash` | Tool-capable Hyde model. |
| `HARNESS_WORKSPACE_ROOT` | this repository | Directory exposed to the read-only tools. |

## Safety boundary

The tools reject absolute paths, traversal outside the workspace, hidden
credential files, `.git`, and `node_modules`. Eve's default shell and sandbox
file tools are disabled; there are intentionally no write or network tools.
Add any mutating capability behind explicit approval before using this as a
broader coding agent.

## Validation

```zsh
npm run typecheck
npm run build
```
