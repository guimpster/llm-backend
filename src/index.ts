import 'dotenv/config';
import express from 'express';
import { ILLMProvider } from './llm/interfaces/llm-provider.interface';
import { OpenAIProvider } from './llm/providers/openai.provider';
import { GeminiProvider } from './llm/providers/gemini.provider';
import { FallbackProvider } from './llm/providers/fallback.provider';
import { TriageService } from './services/triage.service';
import { createTriageRouter } from './routes/triage.route';
import { errorHandler } from './middleware/error-handler.middleware';
import { requestLogger } from './middleware/request-logger.middleware';
import { logger } from './utils/logger';

const app = express();
const port = process.env.PORT || 3000;

// 1. Dependencies Setup (Manual DI)
const providers: ILLMProvider[] = [];

if (process.env.OPENAI_API_KEY) {
  providers.push(new OpenAIProvider(process.env.OPENAI_API_KEY));
} else {
  logger.warn('OPENAI_API_KEY not found in environment');
}

if (process.env.GEMINI_API_KEY) {
  providers.push(new GeminiProvider(process.env.GEMINI_API_KEY));
} else {
  logger.warn('GEMINI_API_KEY not found in environment');
}

if (providers.length === 0) {
  logger.error('No LLM providers configured. Set OPENAI_API_KEY or GEMINI_API_KEY.');
  process.exit(1);
}

// Wrap providers with fallback logic (Composite Pattern)
const llmProvider = new FallbackProvider(providers);
const triageService = new TriageService(llmProvider);

// 2. Middleware
app.use(express.json());
app.use(requestLogger);

// 3. Routes
app.use('/triage-ticket', createTriageRouter(triageService));

// 4. Error Handling (must be last)
app.use(errorHandler);

// 5. Start Server
app.listen(port, () => {
  logger.info(`Server listening at http://localhost:${port}`);
  logger.info(`Configured providers: ${providers.map(p => p.name).join(', ')}`);
});
