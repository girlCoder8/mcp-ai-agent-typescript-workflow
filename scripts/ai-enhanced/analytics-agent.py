#!/usr/bin/env python3
"""
Analytics Agent for Digital Event Validation and User Journey Tracking
Implements AI-driven analytics validation with real-time monitoring capabilities.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from pathlib import Path
import re
import hashlib

import aiohttp
import numpy as np
import pandas as pd
from pydantic import BaseModel, validator
import openai
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class AnalyticsEvent:
    """Represents a digital analytics event."""
    event_name: str
    timestamp: datetime
    user_id: str
    session_id: str
    page_url: str
    event_properties: Dict[str, Any]
    expected_properties: Dict[str, Any]
    validation_status: str = "pending"
    confidence_score: float = 0.0
    anomaly_detected: bool = False

class EventValidationConfig(BaseModel):
    """Configuration for event validation rules."""
    event_name: str
    required_properties: List[str]
    optional_properties: List[str] = []
    property_types: Dict[str, str] = {}
    business_rules: List[Dict[str, Any]] = []
    sampling_rate: float = 1.0

    @validator('sampling_rate')
    def validate_sampling_rate(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError('Sampling rate must be between 0.0 and 1.0')
        return v

class UserJourney(BaseModel):
    """Represents a user journey with expected event sequence."""
    journey_id: str
    journey_name: str
    expected_events: List[str]
    max_duration_minutes: int = 30
    critical_events: List[str] = []
    conversion_events: List[str] = []

class AnalyticsAgent:
    """
    Advanced Analytics Agent for comprehensive digital event validation.
    Provides AI-driven insights and real-time monitoring capabilities.
    """

    def __init__(self, config_path: str = "config/analytics_config.json"):
        """Initialize the Analytics Agent with configuration."""
        self.config_path = Path(config_path)
        self.config = self._load_config()
        self.openai_client = openai.AsyncOpenAI()
        self.session = None
        self.validation_rules = {}
        self.user_journeys = {}
        self.event_buffer = []
        self.anomaly_threshold = 0.85
        self.performance_metrics = {
            "events_processed": 0,
            "validation_errors": 0,
            "anomalies_detected": 0,
            "journey_completions": 0,
            "avg_processing_time": 0.0
        }

    def _load_config(self) -> Dict[str, Any]:
        """Load analytics validation configuration."""
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r') as f:
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
            "analytics_platforms": ["google_analytics", "adobe_analytics"],
            "validation_rules": [],
            "user_journeys": [],
            "monitoring": {
                "real_time_alerts": True,
                "batch_processing_interval": 300,
                "anomaly_detection_enabled": True
            },
            "ai_settings": {
                "model": "gpt-4",
                "temperature": 0.3,
                "max_tokens": 1000
            }
        }

    async def initialize(self):
        """Initialize the analytics agent."""
        logger.info("Initializing Analytics Agent...")

        # Setup HTTP session
        self.session = aiohttp.ClientSession()

        # Load validation rules
        await self._load_validation_rules()

        # Load user journeys
        await self._load_user_journeys()

        # Start background monitoring
        asyncio.create_task(self._background_monitoring())

        logger.info("Analytics Agent initialized successfully")

    async def _load_validation_rules(self):
        """Load event validation rules."""
        for rule_config in self.config.get("validation_rules", []):
            try:
                rule = EventValidationConfig(**rule_config)
                self.validation_rules[rule.event_name] = rule
                logger.info(f"Loaded validation rule for: {rule.event_name}")
            except Exception as e:
                logger.error(f"Error loading validation rule: {e}")

    async def _load_user_journeys(self):
        """Load user journey definitions."""
        for journey_config in self.config.get("user_journeys", []):
            try:
                journey = UserJourney(**journey_config)
                self.user_journeys[journey.journey_id] = journey
                logger.info(f"Loaded user journey: {journey.journey_name}")
            except Exception as e:
                logger.error(f"Error loading user journey: {e}")

    async def validate_event(self, event: AnalyticsEvent) -> Dict[str, Any]:
        """
        Validate a single analytics event against defined rules.

        Args:
            event: The analytics event to validate

        Returns:
            Validation result with details and recommendations
        """
        start_time = time.time()

        try:
            # Get validation rule
            rule = self.validation_rules.get(event.event_name)
            if not rule:
                return {
                    "status": "no_rule",
                    "message": f"No validation rule found for event: {event.event_name}",
                    "confidence": 0.0
                }

            # Validate required properties
            missing_props = []
            for prop in rule.required_properties:
                if prop not in event.event_properties:
                    missing_props.append(prop)

            # Validate property types
            type_errors = []
            for prop, expected_type in rule.property_types.items():
                if prop in event.event_properties:
                    actual_value = event.event_properties[prop]
                    if not self._validate_property_type(actual_value, expected_type):
                        type_errors.append(f"{prop}: expected {expected_type}")

            # Apply business rules
            business_rule_errors = []
            for business_rule in rule.business_rules:
                if not await self._evaluate_business_rule(event, business_rule):
                    business_rule_errors.append(business_rule.get("description", "Unknown rule"))

            # Calculate confidence score
            total_checks = len(rule.required_properties) + len(rule.property_types) + len(rule.business_rules)
            failed_checks = len(missing_props) + len(type_errors) + len(business_rule_errors)
            confidence = max(0.0, (total_checks - failed_checks) / total_checks) if total_checks > 0 else 1.0

            # AI-powered anomaly detection
            anomaly_detected = await self._detect_anomaly(event, confidence)

            # Update event
            event.validation_status = "passed" if confidence >= 0.8 else "failed"
            event.confidence_score = confidence
            event.anomaly_detected = anomaly_detected

            # Update metrics
            self.performance_metrics["events_processed"] += 1
            if confidence < 0.8:
                self.performance_metrics["validation_errors"] += 1
            if anomaly_detected:
                self.performance_metrics["anomalies_detected"] += 1

            processing_time = time.time() - start_time
            self.performance_metrics["avg_processing_time"] = (
                    (self.performance_metrics["avg_processing_time"] * (self.performance_metrics["events_processed"] - 1) + processing_time) /
                    self.performance_metrics["events_processed"]
            )

            return {
                "status": event.validation_status,
                "confidence": confidence,
                "anomaly_detected": anomaly_detected,
                "issues": {
                    "missing_properties": missing_props,
                    "type_errors": type_errors,
                    "business_rule_errors": business_rule_errors
                },
                "processing_time_ms": processing_time * 1000,
                "recommendations": await self._generate_recommendations(event, missing_props, type_errors, business_rule_errors)
            }

        except Exception as e:
            logger.error(f"Error validating event {event.event_name}: {e}")
            return {
                "status": "error",
                "message": str(e),
                "confidence": 0.0
            }

    def _validate_property_type(self, value: Any, expected_type: str) -> bool:
        """Validate property type."""
        type_mapping = {
            "string": str,
            "integer": int,
            "float": (int, float),
            "boolean": bool,
            "array": list,
            "object": dict
        }

        expected_python_type = type_mapping.get(expected_type.lower())
        if not expected_python_type:
            return True  # Unknown type, assume valid

        return isinstance(value, expected_python_type)

    async def _evaluate_business_rule(self, event: AnalyticsEvent, rule: Dict[str, Any]) -> bool:
        """Evaluate a business rule against an event."""
        try:
            rule_type = rule.get("type")

            if rule_type == "range_check":
                prop_name = rule["property"]
                min_val = rule.get("min")
                max_val = rule.get("max")
                value = event.event_properties.get(prop_name)

                if value is None:
                    return rule.get("allow_null", False)

                if min_val is not None and value < min_val:
                    return False
                if max_val is not None and value > max_val:
                    return False
                return True

            elif rule_type == "regex_match":
                prop_name = rule["property"]
                pattern = rule["pattern"]
                value = str(event.event_properties.get(prop_name, ""))
                return bool(re.match(pattern, value))

            elif rule_type == "conditional":
                condition = rule["condition"]
                # Simple condition evaluation (extend as needed)
                return eval(condition, {"event": event.event_properties})

            return True

        except Exception as e:
            logger.error(f"Error evaluating business rule: {e}")
            return False

    async def _detect_anomaly(self, event: AnalyticsEvent, confidence: float) -> bool:
        """AI-powered anomaly detection."""
        try:
            # Use AI to detect anomalies based on event patterns
            prompt = f"""
            Analyze this analytics event for anomalies:
            
            Event: {event.event_name}
            Properties: {json.dumps(event.event_properties, indent=2)}
            Timestamp: {event.timestamp.isoformat()}
            Confidence Score: {confidence}
            
            Consider:
            1. Unusual property values
            2. Timing anomalies
            3. Missing expected correlations
            4. Statistical outliers
            
            Return JSON with:
            - anomaly_detected: boolean
            - anomaly_score: float (0-1)
            - reasons: list of reasons if anomaly detected
            """

            response = await self.openai_client.chat.completions.create(
                model=self.config["ai_settings"]["model"],
                messages=[{"role": "user", "content": prompt}],
                temperature=self.config["ai_settings"]["temperature"],
                max_tokens=self.config["ai_settings"]["max_tokens"]
            )

            result = json.loads(response.choices[0].message.content)
            return result.get("anomaly_detected", False) and result.get("anomaly_score", 0) > self.anomaly_threshold

        except Exception as e:
            logger.error(f"Error in anomaly detection: {e}")
            return False

    async def _generate_recommendations(self, event: AnalyticsEvent, missing_props: List[str],
                                        type_errors: List[str], business_errors: List[str]) -> List[str]:
        """Generate AI-powered recommendations for event issues."""
        if not (missing_props or type_errors or business_errors):
            return []

        try:
            issues_summary = {
                "missing_properties": missing_props,
                "type_errors": type_errors,
                "business_rule_errors": business_errors
            }

            prompt = f"""
            Generate actionable recommendations for fixing these analytics event validation issues:
            
            Event: {event.event_name}
            Issues: {json.dumps(issues_summary, indent=2)}
            
            Provide specific, technical recommendations that developers can implement.
            Focus on:
            1. Code changes needed
            2. Configuration updates
            3. Testing strategies
            4. Prevention measures
            
            Return as a JSON array of recommendation strings.
            """

            response = await self.openai_client.chat.completions.create(
                model=self.config["ai_settings"]["model"],
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=500
            )

            return json.loads(response.choices[0].message.content)

        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return ["Review event implementation and validation rules"]

    async def validate_user_journey(self, session_id: str, events: List[AnalyticsEvent]) -> Dict[str, Any]:
        """
        Validate a complete user journey.

        Args:
            session_id: The user session ID
            events: List of events in the session

        Returns:
            Journey validation result
        """
        try:
            # Sort events by timestamp
            sorted_events = sorted(events, key=lambda x: x.timestamp)
            event_names = [e.event_name for e in sorted_events]

            # Find matching journey pattern
            best_match = None
            best_score = 0.0

            for journey_id, journey in self.user_journeys.items():
                score = self._calculate_journey_match_score(event_names, journey.expected_events)
                if score > best_score:
                    best_score = score
                    best_match = journey

            if not best_match:
                return {
                    "status": "no_match",
                    "message": "No matching user journey found",
                    "completion_rate": 0.0
                }

            # Validate journey completion
            completion_rate = self._calculate_completion_rate(event_names, best_match.expected_events)

            # Check for critical events
            missing_critical = [e for e in best_match.critical_events if e not in event_names]

            # Calculate journey duration
            if sorted_events:
                duration = (sorted_events[-1].timestamp - sorted_events[0].timestamp).total_seconds() / 60
                duration_valid = duration <= best_match.max_duration_minutes
            else:
                duration = 0
                duration_valid = True

            # Check conversion events
            conversions = [e for e in best_match.conversion_events if e in event_names]
            conversion_rate = len(conversions) / len(best_match.conversion_events) if best_match.conversion_events else 1.0

            status = "completed" if completion_rate >= 0.8 and not missing_critical and duration_valid else "incomplete"

            if status == "completed":
                self.performance_metrics["journey_completions"] += 1

            return {
                "status": status,
                "journey_name": best_match.journey_name,
                "completion_rate": completion_rate,
                "duration_minutes": duration,
                "duration_valid": duration_valid,
                "missing_critical_events": missing_critical,
                "conversion_rate": conversion_rate,
                "event_sequence": event_names,
                "expected_sequence": best_match.expected_events
            }

        except Exception as e:
            logger.error(f"Error validating user journey: {e}")
            return {
                "status": "error",
                "message": str(e)
            }

    def _calculate_journey_match_score(self, actual_events: List[str], expected_events: List[str]) -> float:
        """Calculate how well actual events match expected journey."""
        if not expected_events:
            return 0.0

        matches = 0
        expected_set = set(expected_events)

        for event in actual_events:
            if event in expected_set:
                matches += 1

        return matches / len(expected_events)

    def _calculate_completion_rate(self, actual_events: List[str], expected_events: List[str]) -> float:
        """Calculate journey completion rate."""
        if not expected_events:
            return 1.0

        completed = 0
        for expected_event in expected_events:
            if expected_event in actual_events:
                completed += 1

        return completed / len(expected_events)

    async def validate_analytics_tags(self, page_url: str, expected_tags: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate analytics tags on a web page.

        Args:
            page_url: URL of the page to validate
            expected_tags: List of expected tag configurations

        Returns:
            Tag validation results
        """
        try:
            # Setup headless browser
            options = webdriver.ChromeOptions()
            options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')

            driver = webdriver.Chrome(options=options)
            driver.get(page_url)

            # Wait for page to load
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )

            validation_results = []

            for expected_tag in expected_tags:
                tag_type = expected_tag["type"]

                if tag_type == "google_analytics":
                    result = await self._validate_ga_tag(driver, expected_tag)
                elif tag_type == "google_tag_manager":
                    result = await self._validate_gtm_tag(driver, expected_tag)
                elif tag_type == "adobe_analytics":
                    result = await self._validate_adobe_tag(driver, expected_tag)
                else:
                    result = await self._validate_custom_tag(driver, expected_tag)

                validation_results.append(result)

            driver.quit()

            # Calculate overall score
            total_tags = len(validation_results)
            passed_tags = sum(1 for r in validation_results if r["status"] == "passed")
            overall_score = passed_tags / total_tags if total_tags > 0 else 0.0

            return {
                "page_url": page_url,
                "overall_score": overall_score,
                "total_tags": total_tags,
                "passed_tags": passed_tags,
                "failed_tags": total_tags - passed_tags,
                "tag_results": validation_results,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error validating analytics tags: {e}")
            return {
                "page_url": page_url,
                "overall_score": 0.0,
                "error": str(e)
            }

    async def _validate_ga_tag(self, driver, expected_tag: Dict[str, Any]) -> Dict[str, Any]:
        """Validate Google Analytics tag."""
        try:
            # Check for GA script
            ga_scripts = driver.find_elements(By.XPATH, "//script[contains(@src, 'googletagmanager.com/gtag/js')]")

            if not ga_scripts:
                return {
                    "tag_type": "google_analytics",
                    "status": "failed",
                    "message": "Google Analytics script not found"
                }

            # Check for GA configuration
            ga_config = driver.execute_script("""
                return window.gtag && window.dataLayer ? 
                    window.dataLayer.filter(item => item[0] === 'config') : [];
            """)

            expected_id = expected_tag.get("tracking_id")
            if expected_id:
                config_found = any(config[1] == expected_id for config in ga_config if len(config) > 1)
                if not config_found:
                    return {
                        "tag_type": "google_analytics",
                        "status": "failed",
                        "message": f"GA tracking ID {expected_id} not configured"
                    }

            return {
                "tag_type": "google_analytics",
                "status": "passed",
                "message": "Google Analytics tag validated successfully"
            }

        except Exception as e:
            return {
                "tag_type": "google_analytics",
                "status": "error",
                "message": str(e)
            }

    async def _validate_gtm_tag(self, driver, expected_tag: Dict[str, Any]) -> Dict[str, Any]:
        """Validate Google Tag Manager tag."""
        try:
            # Check for GTM script
            gtm_scripts = driver.find_elements(By.XPATH, "//script[contains(text(), 'googletagmanager.com/gtm.js')]")

            if not gtm_scripts:
                return {
                    "tag_type": "google_tag_manager",
                    "status": "failed",
                    "message": "Google Tag Manager script not found"
                }

            # Check for GTM container ID
            expected_container_id = expected_tag.get("container_id")
            if expected_container_id:
                container_found = any(expected_container_id in script.get_attribute("innerHTML")
                                      for script in gtm_scripts)
                if not container_found:
                    return {
                        "tag_type": "google_tag_manager",
                        "status": "failed",
                        "message": f"GTM container ID {expected_container_id} not found"
                    }

            return {
                "tag_type": "google_tag_manager",
                "status": "passed",
                "message": "Google Tag Manager tag validated successfully"
            }

        except Exception as e:
            return {
                "tag_type": "google_tag_manager",
                "status": "error",
                "message": str(e)
            }

    async def _validate_adobe_tag(self, driver, expected_tag: Dict[str, Any]) -> Dict[str, Any]:
        """Validate Adobe Analytics tag."""
        try:
            # Check for Adobe Analytics script
            adobe_scripts = driver.find_elements(By.XPATH, "//script[contains(@src, 'adobe') or contains(text(), 's_code')]")

            if not adobe_scripts:
                return {
                    "tag_type": "adobe_analytics",
                    "status": "failed",
                    "message": "Adobe Analytics script not found"
                }

            # Check for Adobe Analytics object
            has_adobe_obj = driver.execute_script("return typeof s !== 'undefined' || typeof _satellite !== 'undefined';")

            if not has_adobe_obj:
                return {
                    "tag_type": "adobe_analytics",
                    "status": "failed",
                    "message": "Adobe Analytics object not initialized"
                }

            return {
                "tag_type": "adobe_analytics",
                "status": "passed",
                "message": "Adobe Analytics tag validated successfully"
            }

        except Exception as e:
            return {
                "tag_type": "adobe_analytics",
                "status": "error",
                "message": str(e)
            }

    async def _validate_custom_tag(self, driver, expected_tag: Dict[str, Any]) -> Dict[str, Any]:
        """Validate custom analytics tag."""
        try:
            selector = expected_tag.get("selector")
            if selector:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                if not elements:
                    return {
                        "tag_type": "custom",
                        "status": "failed",
                        "message": f"Custom tag with selector '{selector}' not found"
                    }

            return {
                "tag_type": "custom",
                "status": "passed",
                "message": "Custom tag validated successfully"
            }

        except Exception as e:
            return {
                "tag_type": "custom",
                "status": "error",
                "message": str(e)
            }

    async def _background_monitoring(self):
        """Background task for continuous monitoring."""
        while True:
            try:
                # Process event buffer
                if self.event_buffer:
                    await self._process_event_buffer()

                # Generate periodic reports
                await self._generate_monitoring_report()

                # Sleep for configured interval
                await asyncio.sleep(self.config["monitoring"]["batch_processing_interval"])

            except Exception as e:
                logger.error(f"Error in background monitoring: {e}")
                await asyncio.sleep(60)  # Sleep for 1 minute on error

    async def _process_event_buffer(self):
        """Process buffered events in batch."""
        events_to_process = self.event_buffer.copy()
        self.event_buffer.clear()

        for event in events_to_process:
            await self.validate_event(event)

    async def _generate_monitoring_report(self):
        """Generate and save monitoring report."""
        try:
            report = {
                "timestamp": datetime.now().isoformat(),
                "performance_metrics": self.performance_metrics,
                "validation_rules_count": len(self.validation_rules),
                "user_journeys_count": len(self.user_journeys),
                "system_health": "healthy" if self.performance_metrics["validation_errors"] < 100 else "degraded"
            }

            # Save report
            report_path = Path("pipeline-reports/analytics-monitoring.json")
            report_path.parent.mkdir(parents=True, exist_ok=True)

            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2)

            logger.info(f"Generated monitoring report: {report_path}")

        except Exception as e:
            logger.error(f"Error generating monitoring report: {e}")

    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics."""
        return self.performance_metrics.copy()

    async def cleanup(self):
        """Clean up resources."""
        if self.session:
            await self.session.close()
        logger.info("Analytics Agent cleaned up successfully")

# Example usage
async def main():
    """Example usage of the Analytics Agent."""
    agent = AnalyticsAgent()
    await agent.initialize()

    # Example event validation
    test_event = AnalyticsEvent(
        event_name="page_view",
        timestamp=datetime.now(),
        user_id="user123",
        session_id="session456",
        page_url="https://example.com/product/123",
        event_properties={
            "page_title": "Product Page",
            "product_id": "123",
            "category": "electronics"
        },
        expected_properties={"page_title": str, "product_id": str}
    )

    result = await agent.validate_event(test_event)
    print(f"Validation result: {json.dumps(result, indent=2)}")

    # Example tag validation
    tag_result = await agent.validate_analytics_tags(
        "https://example.com",
        [
            {
                "type": "google_analytics",
                "tracking_id": "GA_MEASUREMENT_ID"
            }
        ]
    )
    print(f"Tag validation result: {json.dumps(tag_result, indent=2)}")

    await agent.cleanup()

if __name__ == "__main__":
    asyncio.run(main())