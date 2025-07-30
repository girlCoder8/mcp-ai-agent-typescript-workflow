#!/usr/bin/env python3
"""
E2E Coordinator - Intelligent Test Orchestration and Execution Management
Provides AI-driven test prioritization, parallel execution, and smart retry logic.
"""

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, field, asdict
from pathlib import Path
from enum import Enum
import subprocess
import concurrent.futures
from collections import defaultdict
import statistics

import numpy as np
import pandas as pd
from pydantic import BaseModel, validator
import openai
import aiofiles
import re
import yaml
from jinja2 import Template

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TestStatus(Enum):
    """Test execution status."""
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    RETRYING = "retrying"
    CANCELLED = "cancelled"

class TestPriority(Enum):
    """Test priority levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

@dataclass
class TestCase:
    """Represents a test case with metadata."""
    id: str
    name: str
    description: str
    file_path: str
    framework: str  # playwright, wdio, etc.
    tags: List[str] = field(default_factory=list)
    priority: TestPriority = TestPriority.MEDIUM
    estimated_duration: int = 60  # seconds
    dependencies: List[str] = field(default_factory=list)
    environments: List[str] = field(default_factory=lambda: ["staging"])
    retry_count: int = 0
    max_retries: int = 3
    flaky_score: float = 0.0
    last_execution: Optional[datetime] = None
    avg_execution_time: float = 0.0
    success_rate: float = 1.0
    failure_patterns: List[str] = field(default_factory=list)

@dataclass
class TestExecution:
    """Represents a test execution instance."""
    execution_id: str
    test_case: TestCase
    status: TestStatus
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: float = 0.0
    error_message: Optional[str] = None
    screenshot_path: Optional[str] = None
    video_path: Optional[str] = None
    logs: List[str] = field(default_factory=list)
    environment: str = "staging"
    browser: str = "chromium"
    retry_attempt: int = 0

class TestSuite(BaseModel):
    """Test suite configuration."""
    name: str
    description: str
    test_cases: List[str]  # Test case IDs
    parallel_execution: bool = True
    max_parallel: int = 4
    timeout_minutes: int = 30
    environments: List[str] = ["staging"]

class SmartRetryConfig(BaseModel):
    """Configuration for intelligent retry logic."""
    max_retries: int = 3
    base_delay: float = 1.0
    exponential_backoff: bool = True
    retry_on_patterns: List[str] = ["TimeoutError", "ElementNotFound", "NetworkError"]
    skip_on_patterns: List[str] = ["AssertionError", "ValidationError"]

class E2ECoordinator:
    """
    Advanced E2E Test Coordinator with AI-driven orchestration.
    Provides intelligent test selection, execution optimization, and failure analysis.
    """

    def __init__(self, config_path: str = "config/e2e_config.yaml"):
        """Initialize the E2E Coordinator."""
        self.config_path = Path(config_path)
        self.config = self._load_config()
        self.openai_client = openai.AsyncOpenAI()

        # Test management
        self.test_cases: Dict[str, TestCase] = {}
        self.test_suites: Dict[str, TestSuite] = {}
        self.active_executions: Dict[str, TestExecution] = {}
        self.execution_history: List[TestExecution] = []

        # Performance tracking
        self.metrics = {
            "total_executions": 0,
            "total_failures": 0,
            "avg_execution_time": 0.0,
            "flaky_tests_detected": 0,
            "retry_success_rate": 0.0,
            "parallel_efficiency": 0.0
        }

        # AI models for decision making
        self.priority_model = None
        self.retry_predictor = None

        # Execution pools
        self.thread_pool = concurrent.futures.ThreadPoolExecutor(max_workers=8)

    def _load_config(self) -> Dict[str, Any]:
        """Load E2E coordinator configuration."""
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r') as f:
                    if self.config_path.suffix == '.yaml':
                        return yaml.safe_load(f)
                    else:
                        return json.load(f)
            else:
                logger.warning(f"Config file not found: {self.config_path}")
                return self._get_default_config()
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            return self._get_default_config()

    def _get_default_config(self) -> Dict[str, Any]:
        """Return default configuration."""
        return {
            "frameworks": {
                "playwright": {
                    "command": "npx playwright test",
                    "config_file": "playwright.config.tc.ts",
                    "report_format": "json"
                },
                "wdio": {
                    "command": "npx wdio run",
                    "config_file": "wdio.conf.ts",
                    "report_format": "json"
                }
            },
            "execution": {
                "max_parallel": 4,
                "default_timeout": 1800,
                "retry_config": {
                    "max_retries": 3,
                    "base_delay": 1.0,
                    "exponential_backoff": True
                }
            },
            "ai_settings": {
                "model": "gpt-4",
                "temperature": 0.3,
                "prioritization_enabled": True,
                "smart_retry_enabled": True
            },
            "reporting": {
                "allure_enabled": True,
                "custom_reports": True,
                "slack_notifications": False
            }
        }

    async def initialize(self):
        """Initialize the E2E Coordinator."""
        logger.info("Initializing E2E Coordinator...")

        # Load test cases
        await self._discover_test_cases()

        # Load test suites
        await self._load_test_suites()

        # Initialize AI models
        await self._initialize_ai_models()

        # Setup monitoring
        asyncio.create_task(self._monitoring_task())

        logger.info(f"E2E Coordinator initialized with {len(self.test_cases)} test cases")

    async def _discover_test_cases(self):
        """Discover and analyze test cases from the project."""
        test_directories = [
            Path("tests"),
            Path("gen-tests"),
            Path("e2e")
        ]

        for test_dir in test_directories:
            if test_dir.exists():
                await self._scan_test_directory(test_dir)

    async def _scan_test_directory(self, directory: Path):
        """Scan directory for test files and extract metadata."""
        test_files = []

        # Find test files
        for pattern in ["**/*.spec.ts", "**/*.test.ts", "**/*.spec.js", "**/*.test.js"]:
            test_files.extend(directory.glob(pattern))

        for test_file in test_files:
            try:
                test_case = await self._parse_test_file(test_file)
                if test_case:
                    self.test_cases[test_case.id] = test_case
                    logger.debug(f"Discovered test case: {test_case.name}")
            except Exception as e:
                logger.error(f"Error parsing test file {test_file}: {e}")

    async def _parse_test_file(self, file_path: Path) -> Optional[TestCase]:
        """Parse test file and extract metadata."""
        try:
            async with aiofiles.open(file_path, 'r') as f:
                content = await f.read()

            # Determine framework
            framework = "playwright" if "playwright" in content or "@playwright/test" in content else "wdio"

            # Extract test metadata using AI
            metadata = await self._extract_test_metadata(content, str(file_path))

            test_case = TestCase(
                id=str(uuid.uuid4()),
                name=metadata.get("name", file_path.stem),
                description=metadata.get("description", ""),
                file_path=str(file_path),
                framework=framework,
                tags=metadata.get("tags", []),
                priority=TestPriority(metadata.get("priority", "medium")),
                estimated_duration=metadata.get("estimated_duration", 60),
                dependencies=metadata.get("dependencies", [])
            )

            # Load historical data if available
            await self._load_test_history(test_case)

            return test_case

        except Exception as e:
            logger.error(f"Error parsing test file {file_path}: {e}")
            return None

    async def _extract_test_metadata(self, content: str, file_path: str) -> Dict[str, Any]:
        """Use AI to extract test metadata from test file content."""
        try:
            prompt = f"""
            Analyze this test file and extract metadata:
            
            File: {file_path}
            Content: {content[:2000]}...
            
            Extract:
            1. Test name/title
            2. Description/purpose
            3. Tags (e.g., @smoke, @regression)
            4. Priority (critical/high/medium/low)
            5. Estimated duration in seconds
            6. Dependencies on other tests
            7. Target environments
            
            Return JSON format:
            {{
                "name": "string",
                "description": "string",
                "tags": ["tag1", "tag2"],
                "priority": "medium",
                "estimated_duration": 60,
                "dependencies": [],
                "environments": ["staging"]
            }}
            """

            response = await self.openai_client.chat.completions.create(
                model=self.config["ai_settings"]["model"],
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=500
            )

            return json.loads(response.choices[0].message.content)

        except Exception as e:
            logger.error(f"Error extracting test metadata: {e}")
            return {}

    async def _load_test_history(self, test_case: TestCase):
        """Load historical execution data for test case."""
        try:
            history_file = Path(f"data/test_history/{test_case.id}.json")
            if history_file.exists():
                async with aiofiles.open(history_file, 'r') as f:
                    history_data = json.loads(await f.read())

                test_case.avg_execution_time = history_data.get("avg_execution_time", 0.0)
                test_case.success_rate = history_data.get("success_rate", 1.0)
                test_case.flaky_score = history_data.get("flaky_score", 0.0)
                test_case.failure_patterns = history_data.get("failure_patterns", [])

                if history_data.get("last_execution"):
                    test_case.last_execution = datetime.fromisoformat(history_data["last_execution"])

        except Exception as e:
            logger.error(f"Error loading test history for {test_case.id}: {e}")

    async def _load_test_suites(self):
        """Load test suite configurations."""
        suites_dir = Path("config/test_suites")
        if suites_dir.exists():
            for suite_file in suites_dir.glob("*.yaml"):
                try:
                    async with aiofiles.open(suite_file, 'r') as f:
                        suite_data = yaml.safe_load(await f.read())

                    suite = TestSuite(**suite_data)
                    self.test_suites[suite.name] = suite
                    logger.info(f"Loaded test suite: {suite.name}")

                except Exception as e:
                    logger.error(f"Error loading test suite {suite_file}: {e}")

    async def _initialize_ai_models(self):
        """Initialize AI models for test prioritization and retry prediction."""
        logger.info("Initializing AI models for test optimization...")
        # Placeholder for custom model initialization
        # In production, you might load pre-trained models here
        pass

    async def execute_test_suite(self, suite_name: str, environment: str = "staging",
                                 filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute a test suite with intelligent orchestration.

        Args:
            suite_name: Name of the test suite to execute
            environment: Target environment
            filters: Additional filters (tags, priority, etc.)

        Returns:
            Execution summary and results
        """
        start_time = datetime.now()
        logger.info(f"Starting execution of test suite: {suite_name}")

        try:
            # Get test suite
            if suite_name not in self.test_suites:
                raise ValueError(f"Test suite '{suite_name}' not found")

            suite = self.test_suites[suite_name]

            # Filter and prioritize test cases
            test_cases = await self._select_and_prioritize_tests(suite, filters)

            if not test_cases:
                return {
                    "status": "no_tests",
                    "message": "No tests match the specified criteria",
                    "execution_time": 0
                }

            # Create execution plan
            execution_plan = await self._create_execution_plan(test_cases, suite, environment)

            # Execute tests
            results = await self._execute_test_plan(execution_plan)

            # Analyze results
            analysis = await self._analyze_execution_results(results)

            # Generate report
            report = await self._generate_execution_report(suite_name, results, analysis, start_time)

            # Update metrics
            await self._update_metrics(results)

            return report

        except Exception as e:
            logger.error(f"Error executing test suite {suite_name}: {e}")
            return {
                "status": "error",
                "message": str(e),
                "execution_time": (datetime.now() - start_time).total_seconds()
            }

    async def _select_and_prioritize_tests(self, suite: TestSuite, filters: Optional[Dict[str, Any]]) -> List[TestCase]:
        """Select and prioritize tests using AI-driven decision making."""
        # Get test cases for suite
        available_tests = [self.test_cases[test_id] for test_id in suite.test_cases
                           if test_id in self.test_cases]

        # Apply filters
        filtered_tests = available_tests

        if filters:
            if "tags" in filters:
                required_tags = set(filters["tags"])
                filtered_tests = [t for t in filtered_tests
                                  if required_tags.intersection(set(t.tags))]

            if "priority" in filters:
                min_priority = TestPriority(filters["priority"])
                priority_order = [TestPriority.CRITICAL, TestPriority.HIGH,
                                  TestPriority.MEDIUM, TestPriority.LOW]
                min_index = priority_order.index(min_priority)
                filtered_tests = [t for t in filtered_tests
                                  if priority_order.index(t.priority) <= min_index]

            if "max_duration" in filters:
                max_duration = filters["max_duration"]
                filtered_tests = [t for t in filtered_tests
                                  if t.estimated_duration <= max_duration]

        # AI-driven prioritization
        if self.config["ai_settings"]["prioritization_enabled"]:
            prioritized_tests = await self._ai_prioritize_tests(filtered_tests)
        else:
            # Fallback to rule-based prioritization
            prioritized_tests = self._rule_based_prioritization(filtered_tests)

        return prioritized_tests

    async def _ai_prioritize_tests(self, test_cases: List[TestCase]) -> List[TestCase]:
        """Use AI to prioritize test execution order."""
        try:
            # Prepare test data for AI analysis
            test_data = []
            for test in test_cases:
                test_data.append({
                    "name": test.name,
                    "priority": test.priority.value,
                    "flaky_score": test.flaky_score,
                    "success_rate": test.success_rate,
                    "avg_execution_time": test.avg_execution_time,
                    "last_execution": test.last_execution.isoformat() if test.last_execution else None,
                    "tags": test.tags
                })

            prompt = f"""
            Prioritize these test cases for execution considering:
            1. Business priority (critical > high > medium > low)
            2. Flaky score (lower is better)
            3. Success rate (higher is better)
            4. Execution time (faster tests first for quick feedback)
            5. Last execution time (recently failed tests get higher priority)
            
            Test data: {json.dumps(test_data, indent=2)}
            
            Return the test names in optimal execution order as a JSON array.
            Focus on maximizing early failure detection and minimizing total execution time.
            """

            response = await self.openai_client.chat.completions.create(
                model=self.config["ai_settings"]["model"],
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1000
            )

            prioritized_names = json.loads(response.choices[0].message.content)

            # Reorder test cases based on AI recommendation
            name_to_test = {test.name: test for test in test_cases}
            prioritized_tests = []

            for name in prioritized_names:
                if name in name_to_test:
                    prioritized_tests.append(name_to_test[name])

            # Add any missing tests at the end
            added_names = set(prioritized_names)
            for test in test_cases:
                if test.name not in added_names:
                    prioritized_tests.append(test)

            return prioritized_tests

        except Exception as e:
            logger.error(f"Error in AI prioritization: {e}")
            return self._rule_based_prioritization(test_cases)

    def _rule_based_prioritization(self, test_cases: List[TestCase]) -> List[TestCase]:
        """Fallback rule-based test prioritization."""
        priority_order = {
            TestPriority.CRITICAL: 4,
            TestPriority.HIGH: 3,
            TestPriority.MEDIUM: 2,
            TestPriority.LOW: 1
        }

        return sorted(test_cases, key=lambda t: (
            priority_order[t.priority],  # Higher priority first
            -t.flaky_score,  # Less flaky first
            t.avg_execution_time  # Faster tests first
        ), reverse=True)

    async def _create_execution_plan(self, test_cases: List[TestCase],
                                     suite: TestSuite, environment: str) -> Dict[str, Any]:
        """Create optimized execution plan."""
        # Group tests by framework for efficient execution
        framework_groups = defaultdict(list)
        for test in test_cases:
            framework_groups[test.framework].append(test)

        # Calculate optimal parallelization
        total_estimated_time = sum(test.avg_execution_time or test.estimated_duration
                                   for test in test_cases)

        optimal_parallel = min(
            suite.max_parallel,
            len(test_cases),
            max(1, int(total_estimated_time / (suite.timeout_minutes * 60 / 2)))
        )

        execution_plan = {
            "suite_name": suite.name,
            "environment": environment,
            "total_tests": len(test_cases),
            "estimated_duration": total_estimated_time / optimal_parallel,
            "parallel_execution": suite.parallel_execution,
            "max_parallel": optimal_parallel,
            "framework_groups": {
                framework: [test.id for test in tests]
                for framework, tests in framework_groups.items()
            },
            "execution_order": [test.id for test in test_cases]
        }

        return execution_plan

    async def _execute_test_plan(self, execution_plan: Dict[str, Any]) -> List[TestExecution]:
        """Execute the test plan with parallel processing and smart retry logic."""
        results = []

        if execution_plan["parallel_execution"]:
            # Parallel execution
            semaphore = asyncio.Semaphore(execution_plan["max_parallel"])
            tasks = []

            for test_id in execution_plan["execution_order"]:
                if test_id in self.test_cases:
                    test_case = self.test_cases[test_id]
                    task = asyncio.create_task(
                        self._execute_single_test_with_semaphore(
                            semaphore, test_case, execution_plan["environment"]
                        )
                    )
                    tasks.append(task)

            # Wait for all tests to complete
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Handle exceptions
            valid_results = []
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Test execution failed with exception: {result}")
                    # Create failed execution record
                    failed_execution = TestExecution(
                        execution_id=str(uuid.uuid4()),
                        test_case=TestCase("unknown", "failed", "", "", "unknown"),
                        status=TestStatus.FAILED,
                        start_time=datetime.now(),
                        end_time=datetime.now(),
                        error_message=str(result)
                    )
                    valid_results.append(failed_execution)
                else:
                    valid_results.append(result)

            results = valid_results
        else:
            # Sequential execution
            for test_id in execution_plan["execution_order"]:
                if test_id in self.test_cases:
                    test_case = self.test_cases[test_id]
                    result = await self._execute_single_test(test_case, execution_plan["environment"])
                    results.append(result)

        return results

    async def _execute_single_test_with_semaphore(self, semaphore: asyncio.Semaphore,
                                                  test_case: TestCase, environment: str) -> TestExecution:
        """Execute single test with semaphore for parallel control."""
        async with semaphore:
            return await self._execute_single_test(test_case, environment)

    async def _execute_single_test(self, test_case: TestCase, environment: str) -> TestExecution:
        """Execute a single test case with retry logic."""
        execution = TestExecution(
            execution_id=str(uuid.uuid4()),
            test_case=test_case,
            status=TestStatus.PENDING,
            environment=environment,
            start_time=datetime.now()
        )

        self.active_executions[execution.execution_id] = execution

        try:
            execution.status = TestStatus.RUNNING

            # Execute test with retry logic
            success = False
            retry_count = 0

            while not success and retry_count <= test_case.max_retries:
                try:
                    execution.retry_attempt = retry_count

                    if retry_count > 0:
                        execution.status = TestStatus.RETRYING
                        # Smart retry delay
                        delay = await self._calculate_retry_delay(test_case, retry_count)
                        await asyncio.sleep(delay)

                    # Execute the actual test
                    test_result = await self._run_test_command(test_case, environment, execution)

                    if test_result["success"]:
                        execution.status = TestStatus.PASSED
                        success = True
                    else:
                        execution.status = TestStatus.FAILED
                        execution.error_message = test_result.get("error", "Unknown error")

                        # Check if we should retry
                        should_retry = await self._should_retry_test(test_case, test_result, retry_count)
                        if not should_retry:
                            break

                    retry_count += 1

                except Exception as e:
                    execution.status = TestStatus.FAILED
                    execution.error_message = str(e)
                    logger.error(f"Test execution error: {e}")
                    break

            execution.end_time = datetime.now()
            execution.duration = (execution.end_time - execution.start_time).total_seconds()

            # Update test case statistics
            await self._update_test_statistics(test_case, execution)

            return execution

        finally:
            # Remove from active executions
            self.active_executions.pop(execution.execution_id, None)

    async def _run_test_command(self, test_case: TestCase, environment: str,
                                execution: TestExecution) -> Dict[str, Any]:
        """Run the actual test command."""
        try:
            framework_config = self.config["frameworks"][test_case.framework]

            # Build command
            cmd_parts = framework_config["command"].split()
            cmd_parts.append(test_case.file_path)

            # Add environment variables
            env = {
                "TEST_ENV": environment,
                "EXECUTION_ID": execution.execution_id,
                "TEST_CASE_ID": test_case.id
            }

            # Execute command
            process = await asyncio.create_subprocess_exec(
                *cmd_parts,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**dict(os.environ), **env},
                cwd=Path.cwd()
            )

            stdout, stderr = await process.communicate()

            # Process results
            success = process.returncode == 0

            # Parse output for additional information
            if stdout:
                execution.logs.append(f"STDOUT: {stdout.decode()}")
            if stderr:
                execution.logs.append(f"STDERR: {stderr.decode()}")

            return {
                "success": success,
                "return_code": process.returncode,
                "stdout": stdout.decode() if stdout else "",
                "stderr": stderr.decode() if stderr else "",
                "error": stderr.decode() if stderr and not success else None
            }

        except Exception as e:
            logger.error(f"Error running test command: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _should_retry_test(self, test_case: TestCase, test_result: Dict[str, Any],
                                 retry_count: int) -> bool:
        """Determine if a test should be retried using AI-powered logic."""
        if retry_count >= test_case.max_retries:
            return False

        try:
            if self.config["ai_settings"]["smart_retry_enabled"]:
                return await self._ai_retry_decision(test_case, test_result, retry_count)
            else:
                return self._rule_based_retry_decision(test_case, test_result, retry_count)
        except Exception as e:
            logger.error(f"Error in retry decision: {e}")
            return retry_count < test_case.max_retries

    async def _ai_retry_decision(self, test_case: TestCase, test_result: Dict[str, Any],
                                 retry_count: int) -> bool:
        """Use AI to make intelligent retry decisions."""
        try:
            prompt = f"""
            Decide if this failed test should be retried:
            
            Test: {test_case.name}
            Retry Attempt: {retry_count + 1}/{test_case.max_retries}
            Flaky Score: {test_case.flaky_score}
            Success Rate: {test_case.success_rate}
            
            Error Details:
            {test_result.get('error', 'No error details')}
            
            Failure Patterns History:
            {', '.join(test_case.failure_patterns)}
            
            Consider:
            1. Is this a transient/flaky failure?
            2. Is the error pattern known to be retryable?
            3. What's the probability of success on retry?
            4. Resource cost vs benefit of retry
            
            Return JSON:
            {{
                "should_retry": boolean,
                "confidence": float (0-1),
                "reason": "explanation"
            }}
            """

            response = await self.openai_client.chat.completions.create(
                model=self.config["ai_settings"]["model"],
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=300
            )

            decision = json.loads(response.choices[0].message.content)

            logger.info(f"AI retry decision for {test_case.name}: {decision}")
            return decision.get("should_retry", False) and decision.get("confidence", 0) > 0.6

        except Exception as e:
            logger.error(f"Error in AI retry decision: {e}")
            return False

    def _rule_based_retry_decision(self, test_case: TestCase, test_result: Dict[str, Any],
                                   retry_count: int) -> bool:
        """Fallback rule-based retry logic."""
        retry_config = SmartRetryConfig(**self.config["execution"]["retry_config"])

        error_message = test_result.get("error", "").lower()

        # Check if error matches skip patterns
        for skip_pattern in retry_config.skip_on_patterns:
            if skip_pattern.lower() in error_message:
                return False

        # Check if error matches retry patterns
        for retry_pattern in retry_config.retry_on_patterns:
            if retry_pattern.lower() in error_message:
                return True

        # Default: retry if test has low flaky score (likely environmental issue)
        return test_case.flaky_score < 0.3

    async def _calculate_retry_delay(self, test_case: TestCase, retry_count: int) -> float:
        """Calculate intelligent retry delay."""
        retry_config = SmartRetryConfig(**self.config["execution"]["retry_config"])

        if retry_config.exponential_backoff:
            delay = retry_config.base_delay * (2 ** retry_count)
        else:
            delay = retry_config.base_delay

        # Add jitter to prevent thundering herd
        jitter = delay * 0.1 * (0.5 - random.random())
        return delay + jitter

    async def _update_test_statistics(self, test_case: TestCase, execution: TestExecution):
        """Update test case statistics based on execution result."""
        try:
            # Update execution time
            if execution.duration > 0:
                if test_case.avg_execution_time == 0:
                    test_case.avg_execution_time = execution.duration
                else:
                    # Running average
                    test_case.avg_execution_time = (test_case.avg_execution_time * 0.8 +
                                                    execution.duration * 0.2)

            # Update success rate
            if execution.status == TestStatus.PASSED:
                test_case.success_rate = test_case.success_rate * 0.9 + 0.1
            else:
                test_case.success_rate = test_case.success_rate * 0.9

            # Update flaky score based on retry attempts
            if execution.retry_attempt > 0:
                if execution.status == TestStatus.PASSED:
                    # Test passed after retry - increase flaky score
                    test_case.flaky_score = min(1.0, test_case.flaky_score + 0.1)
                else:
                    # Test failed even with retries - might not be flaky
                    test_case.flaky_score = max(0.0, test_case.flaky_score - 0.05)

            # Update failure patterns
            if execution.status == TestStatus.FAILED and execution.error_message:
                # Extract error pattern
                error_pattern = self._extract_error_pattern(execution.error_message)
                if error_pattern and error_pattern not in test_case.failure_patterns:
                    test_case.failure_patterns.append(error_pattern)
                    # Keep only recent patterns
                    if len(test_case.failure_patterns) > 10:
                        test_case.failure_patterns.pop(0)

            test_case.last_execution = datetime.now()

            # Save updated statistics
            await self._save_test_statistics(test_case)

        except Exception as e:
            logger.error(f"Error updating test statistics: {e}")

    def _extract_error_pattern(self, error_message: str) -> Optional[str]:
        """Extract meaningful error pattern from error message."""
        # Common error patterns
        patterns = [
            r'TimeoutError: (.+)',
            r'ElementNotFound: (.+)',
            r'AssertionError: (.+)',
            r'NetworkError: (.+)',
            r'Error: (.+?)\n'
        ]

        for pattern in patterns:
            match = re.search(pattern, error_message, re.IGNORECASE)
            if match:
                return match.group(1)[:100]  # Limit length

        # Return first line of error if no pattern matches
        return error_message.split('\n')[0][:100]

    async def _save_test_statistics(self, test_case: TestCase):
        """Save test statistics to persistent storage."""
        try:
            history_dir = Path("data/test_history")
            history_dir.mkdir(parents=True, exist_ok=True)

            history_data = {
                "test_id": test_case.id,
                "avg_execution_time": test_case.avg_execution_time,
                "success_rate": test_case.success_rate,
                "flaky_score": test_case.flaky_score,
                "failure_patterns": test_case.failure_patterns,
                "last_execution": test_case.last_execution.isoformat() if test_case.last_execution else None,
                "last_updated": datetime.now().isoformat()
            }

            history_file = history_dir / f"{test_case.id}.json"
            async with aiofiles.open(history_file, 'w') as f:
                await f.write(json.dumps(history_data, indent=2))

        except Exception as e:
            logger.error(f"Error saving test statistics: {e}")

    async def _analyze_execution_results(self, results: List[TestExecution]) -> Dict[str, Any]:
        """Analyze execution results and provide insights."""
        total_tests = len(results)
        passed_tests = len([r for r in results if r.status == TestStatus.PASSED])
        failed_tests = len([r for r in results if r.status == TestStatus.FAILED])

        # Calculate metrics
        pass_rate = passed_tests / total_tests if total_tests > 0 else 0
        avg_duration = sum(r.duration for r in results) / total_tests if total_tests > 0 else 0

        # Identify flaky tests (tests that passed after retry)
        flaky_tests = [r for r in results if r.status == TestStatus.PASSED and r.retry_attempt > 0]

        # Analyze failure patterns
        failure_patterns = defaultdict(int)
        for result in results:
            if result.status == TestStatus.FAILED and result.error_message:
                pattern = self._extract_error_pattern(result.error_message)
                if pattern:
                    failure_patterns[pattern] += 1

        # Calculate parallel efficiency
        total_sequential_time = sum(r.duration for r in results)
        actual_wall_clock_time = max(r.duration for r in results) if results else 0
        parallel_efficiency = (total_sequential_time / actual_wall_clock_time) if actual_wall_clock_time > 0 else 0

        analysis = {
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "pass_rate": pass_rate,
                "avg_duration": avg_duration,
                "total_duration": sum(r.duration for r in results)
            },
            "performance": {
                "parallel_efficiency": parallel_efficiency,
                "fastest_test": min(results, key=lambda x: x.duration).test_case.name if results else None,
                "slowest_test": max(results, key=lambda x: x.duration).test_case.name if results else None
            },
            "quality": {
                "flaky_tests": len(flaky_tests),
                "retry_success_rate": len(flaky_tests) / len([r for r in results if r.retry_attempt > 0]) if any(r.retry_attempt > 0 for r in results) else 0,
                "common_failure_patterns": dict(sorted(failure_patterns.items(), key=lambda x: x[1], reverse=True)[:5])
            },
        }
        analysis["recommendations"] = await self._generate_execution_recommendations(results, analysis)

        return analysis

    async def _generate_execution_recommendations(self, results: List[TestExecution],
                                                  analysis: Dict[str, Any]) -> List[str]:
        """Generate AI-powered recommendations for test optimization."""
        try:
            recommendations_prompt = f"""
            Analyze these test execution results and provide actionable recommendations:
            
            Execution Summary:
            - Total Tests: {analysis['summary']['total_tests']}
            - Pass Rate: {analysis['summary']['pass_rate']:.2%}
            - Average Duration: {analysis['summary']['avg_duration']:.2f}s
            - Parallel Efficiency: {analysis['performance']['parallel_efficiency']:.2%}
            - Flaky Tests: {analysis['quality']['flaky_tests']}
            - Retry Success Rate: {analysis['quality']['retry_success_rate']:.2%}
            
            Common Failure Patterns:
            {json.dumps(analysis['quality']['common_failure_patterns'], indent=2)}
            
            Provide specific, actionable recommendations for:
            1. Improving test reliability
            2. Optimizing execution time
            3. Reducing flaky tests
            4. Better parallel execution
            5. Infrastructure improvements
            
            Return as JSON array of recommendation strings.
            """

            response = await self.openai_client.chat.completions.create(
                model=self.config["ai_settings"]["model"],
                messages=[{"role": "user", "content": recommendations_prompt}],
                temperature=0.3,
                max_tokens=800
            )

            return json.loads(response.choices[0].message.content)

        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return [
                "Review failed tests for common patterns",
                "Consider increasing retry attempts for flaky tests",
                "Optimize slow tests to improve overall execution time"
            ]

    async def _generate_execution_report(self, suite_name: str, results: List[TestExecution],
                                         analysis: Dict[str, Any], start_time: datetime) -> Dict[str, Any]:
        """Generate comprehensive execution report."""
        end_time = datetime.now()
        execution_time = (end_time - start_time).total_seconds()

        # Detailed test results
        detailed_results = []
        for result in results:
            detailed_results.append({
                "test_id": result.test_case.id,
                "test_name": result.test_case.name,
                "status": result.status.value,
                "duration": result.duration,
                "retry_attempts": result.retry_attempt,
                "error_message": result.error_message,
                "framework": result.test_case.framework,
                "tags": result.test_case.tags,
                "environment": result.environment
            })

        report = {
            "suite_name": suite_name,
            "execution_id": str(uuid.uuid4()),
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "execution_time": execution_time,
            "analysis": analysis,
            "detailed_results": detailed_results,
            "metadata": {
                "coordinator_version": "1.0.0",
                "ai_enabled": self.config["ai_settings"]["prioritization_enabled"],
                "parallel_execution": len(results) > 1
            }
        }

        # Save report
        await self._save_execution_report(report)

        return report

    async def _save_execution_report(self, report: Dict[str, Any]):
        """Save execution report to file system."""
        try:
            reports_dir = Path("pipeline-reports")
            reports_dir.mkdir(parents=True, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_file = reports_dir / f"e2e_execution_{timestamp}.json"

            async with aiofiles.open(report_file, 'w') as f:
                await f.write(json.dumps(report, indent=2))

            logger.info(f"Execution report saved: {report_file}")

        except Exception as e:
            logger.error(f"Error saving execution report: {e}")

    async def _update_metrics(self, results: List[TestExecution]):
        """Update global performance metrics."""
        self.metrics["total_executions"] += len(results)
        self.metrics["total_failures"] += len([r for r in results if r.status == TestStatus.FAILED])

        if results:
            avg_duration = sum(r.duration for r in results) / len(results)
            if self.metrics["avg_execution_time"] == 0:
                self.metrics["avg_execution_time"] = avg_duration
            else:
                self.metrics["avg_execution_time"] = (self.metrics["avg_execution_time"] * 0.8 +
                                                      avg_duration * 0.2)

        # Update flaky test metrics
        flaky_count = len([r for r in results if r.status == TestStatus.PASSED and r.retry_attempt > 0])
        self.metrics["flaky_tests_detected"] += flaky_count

        # Update retry success rate
        retried_tests = [r for r in results if r.retry_attempt > 0]
        if retried_tests:
            successful_retries = len([r for r in retried_tests if r.status == TestStatus.PASSED])
            retry_rate = successful_retries / len(retried_tests)
            if self.metrics["retry_success_rate"] == 0:
                self.metrics["retry_success_rate"] = retry_rate
            else:
                self.metrics["retry_success_rate"] = (self.metrics["retry_success_rate"] * 0.8 +
                                                      retry_rate * 0.2)

    async def _monitoring_task(self):
        """Background monitoring task."""
        while True:
            try:
                # Monitor active executions
                await self._monitor_active_executions()

                # Generate periodic metrics report
                await self._generate_metrics_report()

                # Cleanup old data
                await self._cleanup_old_data()

                # Sleep for monitoring interval
                await asyncio.sleep(60)  # Monitor every minute

            except Exception as e:
                logger.error(f"Error in monitoring task: {e}")
                await asyncio.sleep(60)

    async def _monitor_active_executions(self):
        """Monitor and timeout long-running executions."""
        timeout_threshold = self.config["execution"]["default_timeout"]
        current_time = datetime.now()

        for execution_id, execution in list(self.active_executions.items()):
            if execution.start_time:
                runtime = (current_time - execution.start_time).total_seconds()
                if runtime > timeout_threshold:
                    logger.warning(f"Test execution timeout: {execution.test_case.name}")
                    execution.status = TestStatus.FAILED
                    execution.error_message = f"Test timed out after {runtime:.1f} seconds"
                    execution.end_time = current_time
                    execution.duration = runtime

                    # Remove from active executions
                    self.active_executions.pop(execution_id, None)

    async def _generate_metrics_report(self):
        """Generate periodic metrics report."""
        try:
            metrics_report = {
                "timestamp": datetime.now().isoformat(),
                "metrics": self.metrics.copy(),
                "active_executions": len(self.active_executions),
                "total_test_cases": len(self.test_cases),
                "test_suites": len(self.test_suites)
            }

            metrics_file = Path("pipeline-reports/e2e_metrics.json")
            metrics_file.parent.mkdir(parents=True, exist_ok=True)

            async with aiofiles.open(metrics_file, 'w') as f:
                await f.write(json.dumps(metrics_report, indent=2))

        except Exception as e:
            logger.error(f"Error generating metrics report: {e}")

    async def _cleanup_old_data(self):
        """Clean up old execution data and reports."""
        try:
            # Clean up old reports (keep last 30 days)
            reports_dir = Path("pipeline-reports")
            if reports_dir.exists():
                cutoff_date = datetime.now() - timedelta(days=30)
                for report_file in reports_dir.glob("e2e_execution_*.json"):
                    if report_file.stat().st_mtime < cutoff_date.timestamp():
                        report_file.unlink()

            # Clean up old test history (keep last 90 days)
            history_dir = Path("data/test_history")
            if history_dir.exists():
                cutoff_date = datetime.now() - timedelta(days=90)
                for history_file in history_dir.glob("*.json"):
                    if history_file.stat().st_mtime < cutoff_date.timestamp():
                        history_file.unlink()

        except Exception as e:
            logger.error(f"Error cleaning up old data: {e}")

    async def get_execution_status(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a specific execution."""
        if execution_id in self.active_executions:
            execution = self.active_executions[execution_id]
            return {
                "execution_id": execution_id,
                "test_name": execution.test_case.name,
                "status": execution.status.value,
                "start_time": execution.start_time.isoformat() if execution.start_time else None,
                "duration": (datetime.now() - execution.start_time).total_seconds() if execution.start_time else 0,
                "retry_attempt": execution.retry_attempt
            }
        return None

    async def cancel_execution(self, execution_id: str) -> bool:
        """Cancel a running execution."""
        if execution_id in self.active_executions:
            execution = self.active_executions[execution_id]
            execution.status = TestStatus.CANCELLED
            execution.end_time = datetime.now()
            execution.duration = (execution.end_time - execution.start_time).total_seconds() if execution.start_time else 0

            # Remove from active executions
            self.active_executions.pop(execution_id, None)

            logger.info(f"Cancelled execution: {execution.test_case.name}")
            return True
        return False

    async def get_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics."""
        return {
            **self.metrics,
            "active_executions": len(self.active_executions),
            "total_test_cases": len(self.test_cases),
            "test_suites": len(self.test_suites),
            "timestamp": datetime.now().isoformat()
        }

    async def cleanup(self):
        """Clean up resources."""
        # Cancel any active executions
        for execution_id in list(self.active_executions.keys()):
            await self.cancel_execution(execution_id)

        # Shutdown thread pool
        self.thread_pool.shutdown(wait=True)

        logger.info("E2E Coordinator cleaned up successfully")

# Example usage and CLI interface
import argparse
import os

async def main():
    """Main CLI interface for E2E Coordinator."""
    parser = argparse.ArgumentParser(description="E2E Test Coordinator")
    parser.add_argument("--suite", required=True, help="Test suite name")
    parser.add_argument("--env", default="staging", help="Target environment")
    parser.add_argument("--tags", nargs="+", help="Filter by tags")
    parser.add_argument("--priority", choices=["critical", "high", "medium", "low"], help="Minimum priority")
    parser.add_argument("--config", default="config/e2e_config.yaml", help="Config file path")

    args = parser.parse_args()

    # Initialize coordinator
    coordinator = E2ECoordinator(config_path=args.config)
    await coordinator.initialize()

    try:
        # Build filters
        filters = {}
        if args.tags:
            filters["tags"] = args.tags
        if args.priority:
            filters["priority"] = args.priority

        # Execute test suite
        logger.info(f"Executing test suite: {args.suite}")
        result = await coordinator.execute_test_suite(
            suite_name=args.suite,
            environment=args.env,
            filters=filters if filters else None
        )

        # Print results
        print(f"\n{'='*50}")
        print(f"Test Suite: {args.suite}")
        print(f"Environment: {args.env}")
        print(f"{'='*50}")

        if result["status"] == "error":
            print(f"❌ Execution failed: {result['message']}")
            return 1

        analysis = result.get("analysis", {})
        summary = analysis.get("summary", {})

        print(f"📊 Results:")
        print(f"  Total Tests: {summary.get('total_tests', 0)}")
        print(f"  Passed: {summary.get('passed', 0)}")
        print(f"  Failed: {summary.get('failed', 0)}")
        print(f"  Pass Rate: {summary.get('pass_rate', 0):.1%}")
        print(f"  Duration: {summary.get('total_duration', 0):.1f}s")

        # Print recommendations
        recommendations = analysis.get("recommendations", [])
        if recommendations:
            print(f"\n💡 Recommendations:")
            for i, rec in enumerate(recommendations[:3], 1):
                print(f"  {i}. {rec}")

        return 0 if summary.get('failed', 0) == 0 else 1

    finally:
        await coordinator.cleanup()

if __name__ == "__main__":
    import sys
    import random

    sys.exit(asyncio.run(main()))