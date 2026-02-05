import { InvalidLLMResponseError } from '../errors';
import { triageOutputSchema, TriageOutput } from '../validation/triage-output.schema';

/**
 * Parses and validates raw LLM response text. Used by all providers so invalid
 * or malformed output is caught in one place and can trigger retry/fallback.
 * Never exposes raw provider output to callers; throws a domain error instead.
 */
export function parseAndValidateLLMOutput(raw: string): TriageOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidLLMResponseError('Model returned invalid JSON');
  }

  const result = triageOutputSchema.safeParse(parsed);
  if (!result.success) {
    // Log shape issues for debugging; do not send to client
    throw new InvalidLLMResponseError('Model response did not match expected schema');
  }
  return result.data;
}
