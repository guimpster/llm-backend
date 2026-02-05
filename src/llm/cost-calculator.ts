/**
 * Cost is calculated locally by design: providers return token usage only;
 * there is no provider cost API. We use published per-model pricing (USD per token).
 * Formula: costUSD = (inputTokens × inputTokenPrice) + (outputTokens × outputTokenPrice).
 * Pricing sources: OpenAI https://openai.com/api/pricing , Gemini https://ai.google.dev/pricing
 */
const PRICE_PER_TOKEN_USD: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  'gemini-3-flash': { input: 0.50 / 1_000_000, output: 3.00 / 1_000_000 },
  'gemini-2.5-flash': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  default: { input: 0.50 / 1_000_000, output: 1.50 / 1_000_000 }
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICE_PER_TOKEN_USD[model] ?? PRICE_PER_TOKEN_USD.default;
  const costUSD = inputTokens * pricing.input + outputTokens * pricing.output;
  return Number(costUSD.toFixed(6));
}
