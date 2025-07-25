# Case Study: When Automation Did Not Deliver

## 🧪 Scenario
A large-scale test suite was written to validate a financial transaction system. The test automation was implemented using Selenium WebDriver.

## 🔻 Outcome
- Test suite took 8+ hours to run, slowing down deployments.
- Tests frequently failed due to timing issues and DOM flakiness.
- QA engineers lost trust in automation reliability.

## 🧠 Lessons Learned
- Avoid over-reliance on end-to-end UI testing. Use API and unit test layers for faster feedback.
- Invest in test observability tools (e.g., Flaky Test dashboards).
- Perform regular pruning and refactoring of test cases.
