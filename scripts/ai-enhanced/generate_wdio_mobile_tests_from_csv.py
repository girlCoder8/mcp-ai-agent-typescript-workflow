import openai, pandas as pd, os

openai.api_key = os.getenv("OPENAI_API_KEY")

df = pd.read_csv("data/mobile_tests.csv")
os.makedirs("gen-ai-tests/wdio", exist_ok=True)

for idx, row in df.iterrows():
    prompt = f"""
Given this stepwise test case for a mobile app:
Title: {row['Title']}
Steps: {row['Steps']}
Platform: {row['Platform']}

Generate a WDIO+Appium Mocha test in TypeScript with best practices.
"""
    resp = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You write WDIO+Appium mobile UI tests in TypeScript."},
            {"role": "user", "content": prompt}
        ]
    )
    code = resp.choices[0].message.content
    fname = f"gen-ai-tests/wdio/mobile_{idx+1}_{row['Title'][:24].replace(' ', '_')}.spec.ts"
    with open(fname, "w") as f:
        f.write(code)
    print(f"Generated: {fname}")
