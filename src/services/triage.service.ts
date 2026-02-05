import { ILLMProvider, TriageResponse } from '../llm/interfaces/llm-provider.interface';
import { TriageInput } from '../validation/triage-input.schema';

export class TriageService {
  constructor(private readonly provider: ILLMProvider) {}

  /** Delegates to the configured provider (with fallback); validation and retries live in providers. */
  async triageTicket(input: TriageInput): Promise<TriageResponse> {
    return this.provider.triage(input.subject, input.body);
  }
}
