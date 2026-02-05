import { ILLMProvider, TriageResponse } from '../interfaces/llm-provider.interface.js';
import { logger } from '../../utils/logger.js';

export class FallbackProvider implements ILLMProvider {
  public name = 'fallback-wrapper';

  constructor(private readonly providers: ILLMProvider[]) {}

  async triage(subject: string, body: string): Promise<TriageResponse> {
    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        logger.info({ provider: provider.name }, `Attempting triage with provider`);
        const result = await provider.triage(subject, body);
        
        // Add which provider was actually used to the response if needed, 
        // though the spec doesn't explicitly require it in the success payload
        return result;
      } catch (error: any) {
        logger.warn({ 
          provider: provider.name, 
          error: error.message 
        }, `Provider failed, trying next fallback`);
        lastError = error;
      }
    }

    const errorMessage = `All LLM providers failed. Last error: ${lastError?.message}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
}
