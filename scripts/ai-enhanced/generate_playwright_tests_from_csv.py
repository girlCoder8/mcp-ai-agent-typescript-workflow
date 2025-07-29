import os
import pandas as pd
import openai
import re
from typing import Dict, List, Any
from pathlib import Path

# --- Configuration ---
MANUAL_CSV_PATH = "test-data/manual_test_cases.csv"
MOBILE_WDIO_CSV_PATH = "test-data/mobile_test_cases.csv"
MOBILE_HEADSPIN_CSV_PATH = "test-data/mobile_headspin_test_cases.csv"
OUT_DIR = "tests"
WEB_OUT_DIR = os.path.join(OUT_DIR, "web")
MOBILE_WDIO_OUT_DIR = os.path.join(OUT_DIR, "mobile/wdio")
MOBILE_HEADSPIN_OUT_DIR = os.path.join(OUT_DIR, "mobile/headspin")
OPENAI_KEY = os.getenv("OPENAI_API_KEY")
MODEL = "gpt-4o"  # Use your preferred OpenAI model

# Create output directories
os.makedirs(WEB_OUT_DIR, exist_ok=True)
os.makedirs(MOBILE_WDIO_OUT_DIR, exist_ok=True)
os.makedirs(MOBILE_HEADSPIN_OUT_DIR, exist_ok=True)  # FIXED: use output dir not file

openai.api_key = OPENAI_KEY

# --- Prompts ---
WEB_BASE_PROMPT = """
You are an expert Playwright automation engineer.
Given the following manual test case for WEB testing:
Test Case ID: {TestCaseID}
Test Case Name: {TestCaseName}
Objective: {Objective}
Precondition: {Precondition}
Test Steps: {TestCaseSteps}
Component: {Component}
Comments: {Comments}

Please generate a Playwright test in idiomatic TypeScript that covers the steps and objective. 
Use good selectors (prefer data-testid, then accessible role selectors), handle basic waits, and include assertions as appropriate.
The test should be suitable for web browsers (Chrome, Firefox, Safari).
Include proper page object patterns where beneficial.
"""

MOBILE_BASE_PROMPT = """
You are an expert Playwright automation engineer specializing in MOBILE testing.
Given the following mobile test case:
Test Case ID: {TestCaseID}
Test Case Name: {TestCaseName}
Objective: {Objective}
Precondition: {Precondition}
Test Steps: {TestCaseSteps}
Component: {Component}
Comments: {Comments}

Please generate a Playwright test in idiomatic TypeScript optimized for MOBILE devices.
- Use mobile-friendly selectors and interactions
- Include proper touch/tap interactions
- Handle mobile-specific waits and viewports
- Consider mobile UI patterns and responsive design
- Use appropriate mobile assertions
"""

def load_manual_test_cases() -> List[Dict[str, Any]]:
    """Load manual test cases from CSV"""
    if not os.path.exists(MANUAL_CSV_PATH):
        print(f"⚠️  Manual test cases file not found: {MANUAL_CSV_PATH}")
        return []

    df = pd.read_csv(MANUAL_CSV_PATH, dtype=str).fillna('')
    test_cases = []

    for idx, row in df.iterrows():
        test_cases.append({
            'TestCaseID': row.get('TestCaseID#', '').strip(),
            'TestCaseName': row.get('TestCaseName', '').strip(),
            'Objective': row.get('Objective', '').strip(),
            'Precondition': row.get('Precondition', '').strip(),
            'TestCaseSteps': row.get('TestCase Steps', row.get('Steps', '')).strip(),
            'Component': row.get('Component', '').strip(),
            'Comments': row.get('Comments', '').strip(),
            'Type': 'web'
        })

    print(f"✅ Loaded {len(test_cases)} manual test cases")
    return test_cases

def parse_wdio_mobile_cases(filepath: str) -> List[Dict[str, Any]]:
    """Parse WDIO mobile test cases from text or CSV file"""
    if not os.path.exists(filepath):
        print(f"⚠️  Mobile WDIO test cases file not found: {filepath}")
        return []

    test_cases = []
    try:
        # Use pandas if CSV format, else use the old regex if plain text
        if filepath.lower().endswith('.csv'):
            df = pd.read_csv(filepath, dtype=str).fillna('')
            for idx, row in df.iterrows():
                test_cases.append({
                    'TestCaseID': row.get('TestCaseID', row.get('ID', '')).strip(),
                    'TestCaseName': row.get('TestCaseName', row.get('Name', '')).strip(),
                    'Objective': row.get('Objective', '').strip(),
                    'Precondition': row.get('Precondition', '').strip(),
                    'TestCaseSteps': row.get('TestCaseSteps', row.get('Steps', '')).strip(),
                    'Component': row.get('Component', '').strip() or 'Mobile',
                    'Comments': row.get('Comments', '').strip(),
                    'Type': 'mobile_wdio'
                })
        else:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            # This assumes only one test per file.
            test_case_match = re.search(r'Test Case: (TC\d+) - (.+)', content)
            preconditions_match = re.search(r'Preconditions:\s*(.*?)(?=Steps:)', content, re.DOTALL)
            steps_match = re.search(r'Steps:\s*(.*?)$', content, re.DOTALL)

            if test_case_match and steps_match:
                test_cases.append({
                    'TestCaseID': test_case_match.group(1),
                    'TestCaseName': test_case_match.group(2).strip(),
                    'Objective': 'Mobile E2E test for authenticated wine purchase',
                    'Precondition': preconditions_match.group(1).strip() if preconditions_match else '',
                    'TestCaseSteps': steps_match.group(1).strip(),
                    'Component': 'Mobile',
                    'Comments': 'Generated from mobile test cases',
                    'Type': 'mobile_wdio'
                })
        print(f"✅ Loaded {len(test_cases)} WDIO mobile test cases")
    except Exception as e:
        print(f"❌ Error loading WDIO mobile test cases: {e}")

    return test_cases

def parse_headspin_mobile_cases(filepath: str) -> List[Dict[str, Any]]:
    """Parse HeadSpin mobile test cases from CSV file"""
    if not os.path.exists(filepath):
        print(f"⚠️  Mobile HeadSpin test cases file not found: {filepath}")
        return []

    test_cases = []
    try:
        df = pd.read_csv(filepath, dtype=str).fillna('')
        for idx, row in df.iterrows():
            test_cases.append({
                'TestCaseID': row.get('TestCaseID', row.get('ID', '')).strip(),
                'TestCaseName': row.get('TestCaseName', row.get('Name', '')).strip(),
                'Objective': row.get('Objective', '').strip(),
                'Precondition': row.get('Precondition', '').strip(),
                'TestCaseSteps': row.get('TestCaseSteps', row.get('Steps', '')).strip(),
                'Component': row.get('Component', '').strip() or 'Mobile',
                'Comments': row.get('Comments', '').strip(),
                'Type': 'mobile_headspin'
            })
        print(f"✅ Loaded {len(test_cases)} HeadSpin mobile test cases")
    except Exception as e:
        print(f"❌ Error loading HeadSpin mobile test cases: {e}")

    return test_cases

def load_mobile_test_cases(source='wdio') -> List[Dict[str, Any]]:
    """
    Load mobile test cases from the selected CSV (or text) file.
    :param source: 'wdio' or 'headspin', or 'all' for both.
    """
    cases = []
    if source == 'wdio':
        cases = parse_wdio_mobile_cases(MOBILE_WDIO_CSV_PATH)
    elif source == 'headspin':
        cases = parse_headspin_mobile_cases(MOBILE_HEADSPIN_CSV_PATH)
    elif source == 'all':
        cases = parse_wdio_mobile_cases(MOBILE_WDIO_CSV_PATH)
        cases += parse_headspin_mobile_cases(MOBILE_HEADSPIN_CSV_PATH)
    else:
        print(f"❌ Unknown source {source}, expected 'wdio', 'headspin', or 'all'.")
    return cases

def make_filename(test_case: Dict[str, Any]) -> str:
    """Generate a safe filename for the test case"""
    name = test_case.get('TestCaseName', '')
    test_id = test_case.get('TestCaseID', 'TC')
    test_type = test_case.get('Type', 'web')

    # Clean the name for filename
    safe_name = "".join(c if c.isalnum() else "_" for c in name)
    safe_name = safe_name[:30]  # Limit length

    return f"{test_id}_{safe_name}_{test_type}.spec.ts"

def clean_code(code: str) -> str:
    """Clean the generated code from AI response"""
    # Remove Markdown code blocks if present
    code = re.sub(r'^```python\s*$', '', code, flags=re.MULTILINE) # Added 'python' and \s* for more robust matching
    code = re.sub(r'\n```$', '', code, flags=re.MULTILINE)
    return code.strip()

def generate_test(test_case: Dict[str, Any]) -> str | None:
    """Generate Playwright test code using OpenAI"""

    # Choose a prompt based on a test type
    if test_case.get('Type', 'web').startswith('mobile'):
        prompt = MOBILE_BASE_PROMPT
    else:
        prompt = WEB_BASE_PROMPT

    ai_prompt = prompt.format(
        TestCaseID=test_case.get('TestCaseID', ''),
        TestCaseName=test_case.get('TestCaseName', ''),
        Objective=test_case.get('Objective', ''),
        Precondition=test_case.get('Precondition', ''),
        TestCaseSteps=test_case.get('TestCaseSteps', ''),
        Component=test_case.get('Component', ''),
        Comments=test_case.get('Comments', '')
    )

    try:
        response = openai.ChatCompletion.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You generate Playwright E2E test scripts in TypeScript. Return only clean TypeScript code without explanations or markdown formatting."
                },
                {"role": "user", "content": ai_prompt}
            ],
            temperature=0.2,
            max_tokens=1200  # Increased for more complex tests
        )

        code = response.choices[0].message.content
        return clean_code(code)

    except Exception as e:
        print(f"❌ Error generating test for {test_case.get('TestCaseName', 'Unknown')}: {e}")
        return None

def save_test(test_case: Dict[str, Any], code: str) -> str:
    """Save the generated test code to the appropriate directory"""
    filename = make_filename(test_case)

    # Choose an output directory based on a test type
    if test_case.get('Type') == 'auto-gen-ai-tests/headspin':
        output_path = os.path.join(MOBILE_HEADSPIN_OUT_DIR, filename)
    elif test_case.get('Type') == 'auto-gen-ai-tests/wdio':
        output_path = os.path.join(MOBILE_WDIO_OUT_DIR, filename)
    else:
        output_path = os.path.join(WEB_OUT_DIR, filename)

    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(code)
        return output_path
    except Exception as e:
        print(f"❌ Error saving test {filename}: {e}")
        return None

def main():
    """Main execution function"""
    print("🚀 Starting Playwright test generation from CSV files...")

    # Load all test cases
    all_test_cases: List[Dict[str, Any]] = []
    all_test_cases.extend(load_manual_test_cases())
    # Switching between WDIO, HeadSpin, or both
    all_test_cases.extend(load_mobile_test_cases('wdio'))
    all_test_cases.extend(load_mobile_test_cases('headspin'))

    if not all_test_cases:
        print("❌ No test cases found to generate!")
        return

    print(f"\n📊 Total test cases to generate: {len(all_test_cases)}")

    # Generate tests
    generated_count = 0
    failed_count = 0

    for i, test_case in enumerate(all_test_cases, 1):
        print(f"\n[{i}/{len(all_test_cases)}] Generating: {test_case.get('TestCaseName', 'Unknown')}")

        # Generate test code
        code = generate_test(test_case)
        if not code:
            failed_count += 1
            continue

        # Save test files
        output_path = save_test(test_case, code)
        if output_path:
            print(f"✅ Generated: {output_path}")
            generated_count += 1
        else:
            failed_count += 1

    # Summary
    print(f"\n📈 Generation Summary:")
    print(f"   ✅ Successfully generated: {generated_count}")
    print(f"   ❌ Failed: {failed_count}")
    print(f"   📁 Output directories:")
    print(f"      - Web tests: {WEB_OUT_DIR}")
    print(f"      - Mobile WDIO tests: {MOBILE_WDIO_OUT_DIR}")
    print(f"      - Mobile HeadSpin tests: {MOBILE_HEADSPIN_OUT_DIR}")

    if generated_count > 0:
        print(f"\n🎉 Test generation completed! Run with: npx playwright test")

if __name__ == "__main__":
    main()
