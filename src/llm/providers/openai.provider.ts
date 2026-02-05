import OpenAI from 'openai';
import { ILLMProvider, TriageResponse } from '../interfaces/llm-provider.interface';
import { calculateCost } from '../cost-calculator';
import { logger } from '../../utils/logger';

export class OpenAIProvider implements ILLMProvider {
  private client: OpenAI;
  public name = 'openai';
  private model = 'gpt-4o-mini';

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async triage(subject: string, body: string): Promise<TriageResponse> {
    const prompt = `
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
    `;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that outputs only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('OpenAI returned an empty response');
      }

      const parsed = JSON.parse(content);
      const inputTokens = completion.usage?.prompt_tokens || 0;
      const outputTokens = completion.usage?.completion_tokens || 0;

      return {
        category: parsed.category,
        priority: parsed.priority,
        flags: parsed.flags,
        usage: {
          inputTokens,
          outputTokens,
          costUSD: calculateCost(this.model, inputTokens, outputTokens),
          model: this.model
        }
      };
    } catch (error) {
      logger.error({ error, provider: this.name }, 'OpenAI triage failed');
      throw error;
    }
  }
}
