# Preventing AI Agents from Leaking Sensitive Data

## 🛡️ Measures in Place

- **Prompt Sanitization**: Remove or mask confidential data before sending prompts to OpenAI or LLM-based systems.
- **Token/Key Scoping**: Use API keys with minimal permissions, and rotate them frequently.
- **Output Filtering**: Validate AI responses using regex or classifiers to catch unintended sensitive disclosures.
- **Local Execution**: Run AI agents using private LLMs (e.g., Llama, Mistral) or local APIs for sensitive contexts.
- **Context Limits**: Restrict how much historical context the agent has access to.
- **Data Redaction Pipelines**: Implement middle-layer that strips or anonymizes sensitive test values.

## 🧾 Logging Policy
- Store AI logs in encrypted stores with strict access controls and redacted context for troubleshooting only.
