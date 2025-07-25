import openai, os

openai.api_key = os.getenv("OPENAI_API_KEY")
PSEUDOCODE_FILE = "scripts/sample.pseudo"
OUT_FILE = "gen-ai-tests/from_pseudocode.ts"

with open(PSEUDOCODE_FILE, "r") as f:
    pseudocode = f.read()

prompt = f"""
Convert this pseudocode into an idiomatic TypeScript function or test.

Pseudocode:
{pseudocode}
"""

response = openai.ChatCompletion.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a TypeScript engineer."},
        {"role": "user", "content": prompt}
    ]
)
ts_code = response.choices[0].message.content

with open(OUT_FILE, "w") as f:
    f.write(ts_code)
