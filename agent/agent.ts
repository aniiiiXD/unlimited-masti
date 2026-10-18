import { defineAgent } from "eve";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const hyde = createOpenAICompatible({
  name: "hyde-inference",
  baseURL: process.env.HYDE_INFERENCE_BASE_URL ?? "https://inference.hyde.tech/v1",
  // Keep the credential outside source control. An empty value lets `eve build`
  // validate this project without a live credential; requests will then fail closed.
  apiKey: process.env.HYDE_INFERENCE_API_KEY ?? "",
  includeUsage: true,
});

export default defineAgent({
  model: hyde(process.env.HYDE_INFERENCE_MODEL ?? "hyde/glm-5.3-flash"),
  modelContextWindowTokens: 1_048_576,
  reasoning: "high",
  limits: {
    maxInputTokensPerSession: 100_000,
    maxOutputTokensPerSession: 16_000,
    sessionTimeoutMs: 60 * 60 * 1_000,
  },
});
