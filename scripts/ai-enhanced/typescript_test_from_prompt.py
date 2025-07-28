import openai, os

def ai_gen_typescript_from_prompt(prompt_text, out_file):
    openai.api_key = os.getenv("OPENAI_API_KEY")
    response = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You generate TypeScript test scripts."},
            {"role": "user", "content": prompt_text}
        ]
    )
    code = response.choices[0].message.content
    with open(out_file, "w") as f:
        f.write(code)

# Example usage
prompt = "Generate a Playwright TS test to login and assert the dashboard loads."
ai_gen_typescript_from_prompt(prompt, "gen-ai-tests/playwright/login.spec.ts")
