# Risks and Security Concerns in Automation

## 📌 Key Areas

- **Test Data Leakage**: Test data may include real user records unless sanitized.
- **False Positives/Negatives**: Can lead to release of buggy or unverified code.
- **CI/CD Supply Chain Risks**: Open-source test tools may introduce vulnerabilities if not vetted.
- **AI Agent Prompt Injection**: Malicious test inputs might exploit AI instructions.
- **Headless Browser Risks**: May expose credentials or session tokens in memory.

## 🛡️ Best Practices

- Integrate DAST/SAST tools into your pipelines.
- Sanitize logs and screenshots.
- Perform penetration testing on CI/CD and agent-facing endpoints.
