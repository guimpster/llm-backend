import { ILLMProvider, TriageResponse } from '../interfaces/llm-provider.interface';
import { ProviderFailureError } from '../../errors';
import { logger } from '../../utils/logger';

export class FallbackProvider implements ILLMProvider {
  public name = 'fallback-wrapper';

  constructor(private readonly providers: ILLMProvider[]) {}

  async triage(subject: string, body: string): Promise<TriageResponse> {
    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        logger.info({ provider: provider.name }, 'Attempting triage with provider');
        return await provider.triage(subject, body);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn({ provider: provider.name, error: message }, 'Provider failed, trying next fallback');
        lastError = error instanceof Error ? error : new Error(message);
      }
    }

    // We never rethrow or expose lastError to the client; only a stable domain message.
    logger.error({ lastError: lastError?.message }, 'All LLM providers failed');
    throw new ProviderFailureError('Triage service temporarily unavailable');
  }
}
