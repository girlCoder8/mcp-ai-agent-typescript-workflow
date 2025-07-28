import os
from jira import JIRA
import openai, json

openai.api_key = os.getenv("OPENAI_API_KEY")

jira = JIRA(
    server=os.getenv("JIRA_URL"),
    basic_auth=(os.getenv("JIRA_USER"), os.getenv("JIRA_TOKEN"))
)

def create_jira_bug(summary, description, project_key='QA', template=""):
    issue = jira.create_issue(
        project=project_key,
        summary=summary,
        description=description or template,
        issuetype={"name": "Bug"}
    )
    print(f"Created bug: {issue.key}")

with open("pipeline-reports/latest_failures.json") as f:
    failed_tests = json.load(f)

for t in failed_tests["tests"]:
    ai_summary = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You create concise JIRA bug descriptions from test failures."},
            {"role": "user", "content": f"Test failure:\n{t['log']}\nGenerate a structured JIRA bug report (summary + description)."}
        ]
    ).choices[0].message.content

    summary, _, description = ai_summary.partition("\n")  # Structure: first line summary, rest description
    create_jira_bug(summary.strip(), description.strip())
