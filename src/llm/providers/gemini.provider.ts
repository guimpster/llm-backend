import { GoogleGenerativeAI } from '@google/generative-ai';
import { ILLMProvider, TriageResponse } from '../interfaces/llm-provider.interface.js';
import { calculateCost } from '../cost-calculator.js';
import { logger } from '../../utils/logger.js';

export class GeminiProvider implements ILLMProvider {
  private genAI: GoogleGenerativeAI;
  public name = 'gemini';
  private model = 'gemini-1.5-flash'; // Using stable SDK model identifier
  private pricingModel = 'gemini-3-flash'; // Using pricing for Gemini 3 Flash as requested

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
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

      IMPORTANT: Return ONLY valid JSON. No markdown code blocks.
    `;

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.model,
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const parsed = JSON.parse(text);
      
      // Gemini's token usage is in the metadata
      const inputTokens = response.usageMetadata?.promptTokenCount || 0;
      const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

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
    } catch (error) {
      logger.error({ error, provider: this.name }, 'Gemini triage failed');
      throw error;
    }
  }
}
