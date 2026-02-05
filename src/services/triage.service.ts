import { ILLMProvider, TriageResponse } from '../llm/interfaces/llm-provider.interface.js';
import { TriageInput } from '../validation/triage-input.schema.js';

export class TriageService {
  constructor(private readonly provider: ILLMProvider) {}

  async triageTicket(input: TriageInput): Promise<TriageResponse> {
    // We could add business logic here (e.g., checking for cached results)
    return this.provider.triage(input.subject, input.body);
  }
}
