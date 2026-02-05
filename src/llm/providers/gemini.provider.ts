import { GoogleGenerativeAI } from '@google/generative-ai';
import { ILLMProvider, TriageResponse } from '../interfaces/llm-provider.interface';
import { calculateCost } from '../cost-calculator';
import { parseAndValidateLLMOutput } from '../parse-llm-response';
import { InvalidLLMResponseError } from '../../errors';
import { logger } from '../../utils/logger';

export class GeminiProvider implements ILLMProvider {
  private genAI: GoogleGenerativeAI;
  public name = 'gemini';
  private model = 'gemini-2.5-flash'; // Stable model (gemini-1.5-flash is no longer available in v1beta)
  private pricingModel = 'gemini-2.5-flash';

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private buildPrompt(subject: string, body: string): string {
    return `
      You are an expert support ticket triaging assistant.
      Analyze the following support ticket and return a JSON response.

      Ticket Subject: ${subject}
      Ticket Body: ${body}

      Response Format (JSON only):
      {
        "category": "billing" | "technical" | "account" | "sales" | "other",
        "priority": "low" | "normal" | "high" | "urgent",
        "flags": {
          "requires_human": boolean,
          "is_abusive": boolean,
          "missing_info": boolean,
          "is_vip_customer": boolean
        }
      }

      Base your categorization and priority on the content. 
      Urgent priority should be used for critical technical failures or billing issues affecting many users.
      High priority for individual billing issues or major technical problems.
      Normal for general questions or minor bugs.
      Low for feature requests or feedback.

      IMPORTANT: Return ONLY valid JSON. No markdown code blocks.
    `;
  }

  /** Single attempt: call API and return content + usage. Used for retry logic. */
  private async callAPI(subject: string, body: string): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: { responseMimeType: 'application/json' }
    });
    const result = await model.generateContent(this.buildPrompt(subject, body));
    const response = result.response;
    const text = response.text();
    if (!text || typeof text !== 'string') {
      throw new InvalidLLMResponseError('Gemini returned an empty response');
    }
    const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
    return { content: text, inputTokens, outputTokens };
  }

  async triage(subject: string, body: string): Promise<TriageResponse> {
    const attempt = async (): Promise<TriageResponse> => {
      const { content, inputTokens, outputTokens } = await this.callAPI(subject, body);
      const parsed = parseAndValidateLLMOutput(content);
      return {
        category: parsed.category,
        priority: parsed.priority,
        flags: parsed.flags,
        usage: {
          inputTokens,
          outputTokens,
          costUSD: calculateCost(this.pricingModel, inputTokens, outputTokens),
          model: this.pricingModel
        }
      };
    };

    try {
      return await attempt();
    } catch (error) {
      // Invalid/malformed output: retry once with same provider, then give up
      if (error instanceof InvalidLLMResponseError) {
        logger.warn({ provider: this.name }, 'Invalid LLM response, retrying once');
        try {
          return await attempt();
        } catch (retryError) {
          logger.error({ provider: this.name }, 'Retry after invalid response failed');
          throw retryError instanceof InvalidLLMResponseError ? retryError : new InvalidLLMResponseError();
        }
      }
      logger.error({ error, provider: this.name }, 'Gemini triage failed');
      throw error;
    }
  }
}
