# LLM API Call & Token Cost Calculator

An interactive web application to make real LLM API calls, inspect request and response payloads, and calculate exact token usage and micro-cent costs.

## Features

- **OpenRouter & Free Models**: Connects to OpenRouter for free, credit-free experimentation (`nvidia/nemotron-3.5-lightning:free`) as well as OpenAI models (`gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`).
- **Interactive Temperature Control**: Dedicated slider from `0.0` (Strict / Deterministic) to `1.5` (Creative / High Variety) with live descriptor badges and result tracking.
- **Transparent Cost Calculation**: Breaks down input tokens and output tokens with real-time pricing formulas:
  $$\text{Cost} = (\text{Input Tokens} \times \text{Input Rate}) + (\text{Output Tokens} \times \text{Output Rate})$$
- **3-Part Payload Inspection**:
  1. **What was sent**: Endpoint, System Prompt, User Message, and request payload.
  2. **What came back**: Model response with one-click copy.
  3. **What it cost**: Detailed token counts and cost calculation.
- **Demo Mode**: Test the application and token formulas without spending API credits.

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Tabalamari/LLM-API-call.git
   cd LLM-API-call
   ```

2. **Configure API Key**:
   Add your OpenRouter key (or OpenAI key) to `.env`:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   # or OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000).
