import json, openai, os

openai.api_key = os.getenv("OPENAI_API_KEY")
LOG_PATH = "pipeline-reports/test_run_history.json"

def is_flaky(history):
    return len(set(history[-5:])) > 1  #l ast 5 runs not all pass/fail

with open(LOG_PATH) as f:
    run_data = json.load(f)

results_summary = []
for test in run_data["tests"]:
    name = test["name"]
    history = test["history"]  # ["pass", "pass", "fail", "pass", "fail"]
    if is_flaky(history):
        ai_comment = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You analyze and summarize flaky tests."},
                {"role": "user", "content": f"Test '{name}' is failing intermittently with recent history: {history}. Suggest likely causes and fixes."}
            ]
        ).choices[0].message.content[:500]
        results_summary.append({"test": name, "flaky": True, "analysis": ai_comment})

print("Flaky tests detected:")
for r in results_summary:
    print(f"- {r['test']}: {r['analysis']}")
