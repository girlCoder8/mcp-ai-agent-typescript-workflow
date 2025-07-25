import os
import pandas as pd
import openai
import re

# --- Configuration ---
CSV_PATH = "data/manual_test_cases.csv"
OUT_DIR = "gen--ai-tests/playwright"
OPENAI_KEY = os.getenv("OPENAI_API_KEY")
MODEL = "gpt-4o"  # Use your preferred OpenAI model

os.makedirs(OUT_DIR, exist_ok=True)
df = pd.read_csv(CSV_PATH, dtype=str).fillna('')  # Ensures missing fields are ''

openai.api_key = OPENAI_KEY

BASE_PROMPT = """
You are an expert Playwright automation engineer.

Given the following manual test case:

Test Case ID: {TestCaseID}
Test Case Name: {TestCaseName}
Objective: {Objective}
Precondition: {Precondition}
Test Steps: {TestCaseSteps}
Component: {Component}
Comments: {Comments}

Please generate a Playwright test in idiomatic TypeScript that covers the steps and objective (use good selectors, handle basic waits, and include assertions as appropriate).
"""

def make_filename(row):
    name = row.get('TestCaseName', '')
    test_id = row.get('TestCaseID#', 'TC')
    safe_name = "".join(c if c.isalnum() else "_" for c in name)
    return f"{test_id}_{safe_name[:34]}.spec.ts"

def clean_code(code: str) -> str:
    # Removes ``````
    pattern = r'^``````$'
    match = re.match(pattern, code.strip(), re.DOTALL)
    if match:
        return match.group(1)
    else:
        return code.strip()

for idx, row in df.iterrows():
    ai_prompt = BASE_PROMPT.format(
        TestCaseID=row.get('TestCaseID#', '').strip(),
        TestCaseName=row.get('TestCaseName', '').strip(),
        Objective=row.get('Objective', '').strip(),
        Precondition=row.get('Precondition', '').strip(),
        TestCaseSteps=row.get('TestCase Steps', row.get('Steps', '')).strip(),
        Component=row.get('Component', '').strip(),
        Comments=row.get('Comments', '').strip()
    )

    try:
        response = openai.ChatCompletion.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You generate Playwright E2E API test scripts in TypeScript. Do not include any explanation—just code."},
                {"role": "user", "content": ai_prompt}
            ],
            temperature=0.2,
            max_tokens=800
        )
        code = response.choices[0].message.content
        code = clean_code(code)
        filename = make_filename(row)
        outfile = os.path.join(OUT_DIR, filename)
        with open(outfile, "w", encoding="utf-8") as f:
            f.write(code)
        print(f"✅ Generated: {outfile}")
    except Exception as e:
        print(f"❌ Error generating test for row {idx + 1} ({row.get('TestCaseName')}): {e}")
