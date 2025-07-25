import asyncio
import platform
import subprocess
from pathlib import Path

FPS = 60

async def run_playwright_tests():
    """Running Playwright tests for web and mobile."""
    result = subprocess.run(["npx", "playwright", "test", "--config=playwright.config.ts"], capture_output=True, text=True)
    return result.stdout

async def run_wdio_tests():
    """Running WebdriverIO tests for mobile."""
    result = subprocess.run(["npx", "wdio", "wdio.conf.ts"], capture_output=True, text=True)
    return result.stdout

async def run_api_tests():
    """Running API tests."""
    result = subprocess.run(["node", "api_tests.json"], capture_output=True, text=True)
    return result.stdout

async def main():
    """Coordinating end-to-end test execution across platforms."""
    tasks = [run_playwright_tests(), run_wdio_tests(), run_api_tests()]
    results = await asyncio.gather(*tasks)
    for result in results:
        print(result)

if platform.system() == "Emscripten":
    asyncio.ensure_future(main())
else:
    if __name__ == "__main__":
        asyncio.run(main())