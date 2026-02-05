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
- An OpenAI API Key and/or a Google Gemini API Key.

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

### Architecture
- **Strategy Pattern**: Used for LLM providers. Each provider implements the `ILLMProvider` interface, encapsulating its specific API calls, prompt structure, and token mapping.
- **Composite Pattern**: The `FallbackProvider` implements the same interface but orchestrates a list of providers, providing automatic fallback logic without the service layer knowing about the complexity.
- **Manual Dependency Injection**: Wired in `src/index.ts` to keep the project lightweight while following SOLID principles.

### LLM Providers & Model Choices
1. **Primary: OpenAI `gpt-4o-mini`**
   - **Why**: Excellent instruction following and JSON output at a very low price point.
   - **Pricing (2026)**: $0.15 / 1M input tokens, $0.60 / 1M output tokens.
2. **Fallback: Google Gemini `gemini-3-flash`**
   - **Why**: Robust fallback with frontier-level performance and very fast response times.
   - **Pricing (2026)**: $0.50 / 1M input tokens, $3.00 / 1M output tokens.

### Triage Logic
- **Categories**: `billing`, `technical`, `account`, `sales`, `other`.
- **Priorities**: `low`, `normal`, `high`, `urgent`.
- **Flags**:
  - `requires_human`: Set true if the issue is complex or sensitive.
  - `is_abusive`: Detects hostile language.
  - `missing_info`: Set true if the agent cannot triage effectively without more details.
  - `is_vip_customer`: Inferred from context if possible (e.g., mentions of "Enterprise plan" or "Premier support").

### Cost Calculation
The cost is calculated per request using the following formula:
`Cost = (InputTokens * InputRate) + (OutputTokens * OutputRate)`
Rates are sourced from official provider pricing pages as of February 2026.

## Future Improvements
- **Caching**: Implement Redis to cache triage results for identical tickets to save cost and time.
- **Retries with Backoff**: Add exponential backoff for transient network errors before falling back to the next provider.
- **Unit & Integration Tests**: Add a test suite using Jest or Vitest with MSW to mock LLM API responses.
- **Observability**: Export logs and metrics to a tool like Grafana or Datadog for better monitoring.
