import openai, os

openai.api_key = os.getenv("OPENAI_API_KEY")

diff_path = "data/recent_diff.txt"
with open(diff_path, "r") as f:
    diff = f.read()

prompt = f"""
Given the following git diff, predict which modified files or functions are most likely to cause test failures or build errors. Provide a risk rating and recommend additional tests or code review focus.

{diff}
"""

result = openai.ChatCompletion.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You predict CI test/build risk from code diffs."},
        {"role": "user", "content": prompt}
    ]
)
print(result.choices[0].message.content)
