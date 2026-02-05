export const PRICING = {
  'gpt-4o-mini': {
    input: 0.15 / 1_000_000,
    output: 0.60 / 1_000_000,
  },
  'gemini-3-flash': {
    input: 0.50 / 1_000_000,
    output: 3.00 / 1_000_000,
  },
  // Default fallback if model name doesn't match exactly
  'default': {
    input: 0.50 / 1_000_000,
    output: 1.50 / 1_000_000,
  }
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const modelPricing = (PRICING as any)[model] || PRICING.default;
  const cost = (inputTokens * modelPricing.input) + (outputTokens * modelPricing.output);
  
  // Return with 6 decimal places for precision in small amounts
  return Number(cost.toFixed(6));
}
