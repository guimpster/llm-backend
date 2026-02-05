# LLM Backend - Triage Service

A small backend service built with TypeScript and Node.js that uses LLMs (OpenAI/Gemini) to triage support tickets.

## Features

- **Automated Triage**: Infers category, priority, and metadata flags from support ticket subjects and bodies.
- **Multi-Provider Fallback**: High reliability using a pattern-based abstraction. It tries the cheapest provider (OpenAI) first and falls back to a secondary provider (Gemini) if the first fails.
- **Cost Tracking**: Calculates the actual USD cost of each request based on real-time token pricing.
- **Structured Logging**: Uses Pino for machine-readable JSON logs with unique request IDs.
- **Validation**: Strict input validation using Zod.

## Prerequisites

- Node.js (LTS version recommended)
- API Keys:
  - **OpenAI API Key**: Get it at [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
  - **Google Gemini API Key**: Get it at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

## Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Setup environment variables:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` and add your API keys.

## Running the Project

### Development Mode
Runs the server with hot-reload and pretty-printed logs:
```bash
npm run dev
```

### Production Mode
Builds and runs the compiled JavaScript:
```bash
npm run build
npm start
```

## API Usage

### Triage a Support Ticket

**Endpoint**: `POST /triage-ticket`

**Example Request**:
```bash
curl -X POST http://localhost:3000/triage-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Cannot log in to my account",
    "body": "I keep getting an incorrect password error even though I just reset it."
  }'
```

**Example Response**:
```json
{
  "category": "account",
  "priority": "normal",
  "flags": {
    "requires_human": true,
    "is_abusive": false,
    "missing_info": false,
    "is_vip_customer": false
  },
  "usage": {
    "inputTokens": 145,
    "outputTokens": 42,
    "costUSD": 0.000047,
    "model": "gpt-4o-mini"
  }
}
```

### Postman Collection
You can also import the provided `LLM-Backend-Triage.postman_collection.json` file into Postman to test different scenarios quickly.

## Implementation Details & Assumptions

### Tradeoffs & Assumptions
- **Strict output validation + one retry**: LLMs can return invalid JSON or shapes that don’t match the schema. We parse safely, validate with a Zod schema, and on failure retry the same provider once; if it still fails we throw so the fallback provider can be tried. This keeps the request from crashing and avoids exposing raw provider output.
- **Provider fallback**: We try the cheapest provider (OpenAI) first and fall back to Gemini on any failure (network, rate limit, or invalid response). This improves reliability without changing the API contract.
- **Cost calculated locally**: Providers return only token counts; there is no provider cost API. We compute USD cost server-side using published per-model pricing so the API can return `costUSD` without extra provider calls.

### LLM Robustness
- **Invalid outputs**: Raw response text is parsed with a try/catch; the result is validated against a strict schema (`triage-output.schema.ts`). On parse or schema failure we throw `InvalidLLMResponseError`, retry the same provider once, then surface a stable 503 with message *"Triage could not be completed: model returned invalid response"*. No raw provider output or stack traces are exposed.
- **Provider failure**: On network/API/rate-limit errors the provider throws; `FallbackProvider` tries the next provider. If all fail we throw `ProviderFailureError` and return 503 *"Triage service temporarily unavailable"*.

### Cost Calculation
- **Formula**: `costUSD = (inputTokens × inputTokenPrice) + (outputTokens × outputTokenPrice)`. All logic lives in `src/llm/cost-calculator.ts`; pricing is per-model and fallback uses a default rate for unknown models.
- **Pricing sources (February 2026)**:
  - [OpenAI pricing](https://openai.com/api/pricing)
  - [Google Gemini pricing](https://ai.google.dev/pricing)

### Architecture
- **Strategy Pattern**: Used for LLM providers. Each provider implements the `ILLMProvider` interface, encapsulating its specific API calls, prompt structure, and token mapping.
- **Composite Pattern**: The `FallbackProvider` implements the same interface but orchestrates a list of providers, providing automatic fallback logic without the service layer knowing about the complexity.
- **Manual Dependency Injection**: Wired in `src/index.ts` to keep the project lightweight while following SOLID principles.

### LLM Providers & Model Choices
1. **Primary: OpenAI `gpt-4o-mini`**
   - **Why**: Excellent instruction following and JSON output at a very low price point.
   - **Pricing (2026)**: $0.15 / 1M input tokens, $0.60 / 1M output tokens.
2. **Fallback: Google Gemini `gemini-2.5-flash`**
   - **Why**: Robust fallback with strong performance and fast response times.
   - **Pricing (2026)**: $0.15 / 1M input tokens, $0.60 / 1M output tokens (see `src/llm/cost-calculator.ts`).

### Triage Logic
- **Categories**: `billing`, `technical`, `account`, `sales`, `other`.
- **Priorities**: `low`, `normal`, `high`, `urgent`.
- **Flags**:
  - `requires_human`: Set true if the issue is complex or sensitive.
  - `is_abusive`: Detects hostile language.
  - `missing_info`: Set true if the agent cannot triage effectively without more details.
  - `is_vip_customer`: Inferred from context if possible (e.g., mentions of "Enterprise plan" or "Premier support").

## Future Improvements
- **Caching**: Implement Redis to cache triage results for identical tickets to save cost and time.
- **Retries with Backoff**: Add exponential backoff for transient network errors before falling back to the next provider.
- **Unit & Integration Tests**: Add a test suite using Jest or Vitest with MSW to mock LLM API responses.
- **Observability**: Export logs and metrics to a tool like Grafana or Datadog for better monitoring.
