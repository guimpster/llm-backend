import 'dotenv/config';
import express from 'express';
import { OpenAIProvider } from './llm/providers/openai.provider.js';
import { GeminiProvider } from './llm/providers/gemini.provider.js';
import { FallbackProvider } from './llm/providers/fallback.provider.js';
import { TriageService } from './services/triage.service.js';
import { createTriageRouter } from './routes/triage.route.js';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { requestLogger } from './middleware/request-logger.middleware.js';
import { logger } from './utils/logger.js';

import { ILLMProvider } from './llm/interfaces/llm-provider.interface.js';

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
