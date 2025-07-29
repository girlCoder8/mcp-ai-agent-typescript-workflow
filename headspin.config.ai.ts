
// HeadSpin AI Configuration Types
interface ApiConfig {
    baseUrl: string;
    apiKey: string;
    timeout: number;
    retries: number;
}

interface AIModelConfig {
    name: string;
    version: string;
    threshold?: number;
    sensitivity?: string;
    categories?: string[];
}

interface AIConfig {
    enabled: boolean;
    models: {
        performance: AIModelConfig;
        anomaly: AIModelConfig;
        insights: AIModelConfig;
    };
    endpoints: {
        analyze: string;
        predict: string;
        insights: string;
    };
}

interface TestingConfig {
    defaultDevice: string;
    defaultLocation: string;
    timeout: number;
    retryOnFailure: boolean;
    maxRetries: number;
}

interface MonitoringConfig {
    realTime: boolean;
    metrics: string[];
    alertThresholds: {
        cpuUsage: number;
        memoryUsage: number;
        networkLatency: number;
        batteryDrain: number;
    };
}

interface ReportingConfig {
    format: string;
    includeScreenshots: boolean;
    includeLogs: boolean;
    aiInsights: boolean;
    exportPath: string;
}

interface HeadSpinConfig {
    api: ApiConfig;
    ai: AIConfig;
    testing: TestingConfig;
    monitoring: MonitoringConfig;
    reporting: ReportingConfig;
    environments: {
        [key: string]: Partial<HeadSpinConfig>;
    };
}
//
const config: HeadSpinConfig = {
    // HeadSpin API Configuration
    api: {
        baseUrl: process.env.HEADSPIN_API_URL || 'https://api-dev.headspin.io',
        apiKey: process.env.HEADSPIN_API_KEY || '',
        timeout: 30000,
        retries: 3,
    },

    // AI/ML Configuration
    ai: {
        enabled: true,
        models: {
            performance: {
                name: 'performance-analyzer',
                version: 'v1.2',
                threshold: 0.85,
            },
            anomaly: {
                name: 'anomaly-detector',
                version: 'v2.1',
                sensitivity: 'medium',
            },
            insights: {
                name: 'insights-generator',
                version: 'v1.5',
                categories: ['performance', 'crashes', 'network'],
            },
        },
        endpoints: {
            analyze: '/v1/ai/analyze',
            predict: '/v1/ai/predict',
            insights: '/v1/ai/insights',
        },
    },

    // Testing Configuration
    testing: {
        defaultDevice: 'iPad Pro',
        defaultLocation: 'US-East',
        timeout: 300000, // 5 minutes
        retryOnFailure: true,
        maxRetries: 2,
    },

    // Monitoring Configuration
    monitoring: {
        realTime: true,
        metrics: [
            'cpu_usage',
            'memory_usage',
            'network_latency',
            'battery_consumption',
            'thermal_state',
        ],
        alertThresholds: {
            cpuUsage: 80,
            memoryUsage: 85,
            networkLatency: 2000,
            batteryDrain: 10,
        },
    },

    // Reporting Configuration
    reporting: {
        format: 'json',
        includeScreenshots: true,
        includeLogs: true,
        aiInsights: true,
        exportPath: './reports',
    },

    // Environment-specific overrides
    environments: {
        development: {
            api: {
                baseUrl: 'https://api-dev.headspin.io',
                apiKey: '',
                timeout: 30000,
                retries: 3,
            },
            ai: {
                enabled: true,
                models: {
                    performance: {
                        name: 'performance-analyzer',
                        version: 'v1.2',
                        threshold: 0.7, // Lower threshold for dev
                    },
                    anomaly: {
                        name: 'anomaly-detector',
                        version: 'v2.1',
                        sensitivity: 'medium',
                    },
                    insights: {
                        name: 'insights-generator',
                        version: 'v1.5',
                        categories: ['performance', 'crashes', 'network'],
                    },
                },
                endpoints: {
                    analyze: '/v1/ai/analyze',
                    predict: '/v1/ai/predict',
                    insights: '/v1/ai/insights',
                },
            },
            testing: {
                defaultDevice: 'iPhone 14 Pro',
                defaultLocation: 'US-East',
                timeout: 300000,
                retryOnFailure: true,
                maxRetries: 2,
            },
            monitoring: {
                realTime: true,
                metrics: [
                    'cpu_usage',
                    'memory_usage',
                    'network_latency',
                    'battery_consumption',
                    'thermal_state',
                ],
                alertThresholds: {
                    cpuUsage: 80,
                    memoryUsage: 85,
                    networkLatency: 2000,
                    batteryDrain: 10,
                },
            },
            reporting: {
                format: 'json',
                includeScreenshots: true,
                includeLogs: true,
                aiInsights: true,
                exportPath: './reports',
            },
        },
        staging: {
            api: {
                baseUrl: 'https://api-staging.headspin.io',
                apiKey: '',
                timeout: 30000,
                retries: 3,
            },
            ai: {
                enabled: true,
                models: {
                    performance: {
                        name: 'performance-analyzer',
                        version: 'v1.2',
                        threshold: 0.85,
                    },
                    anomaly: {
                        name: 'anomaly-detector',
                        version: 'v2.1',
                        sensitivity: 'medium',
                    },
                    insights: {
                        name: 'insights-generator',
                        version: 'v1.5',
                        categories: ['performance', 'crashes', 'network'],
                    },
                },
                endpoints: {
                    analyze: '/v1/ai/analyze',
                    predict: '/v1/ai/predict',
                    insights: '/v1/ai/insights',
                },
            },
            testing: {
                defaultDevice: 'iPhone 14 Pro',
                defaultLocation: 'US-East',
                timeout: 300000,
                retryOnFailure: true,
                maxRetries: 2,
            },
            monitoring: {
                realTime: true,
                metrics: [
                    'cpu_usage',
                    'memory_usage',
                    'network_latency',
                    'battery_consumption',
                    'thermal_state',
                ],
                alertThresholds: {
                    cpuUsage: 80,
                    memoryUsage: 85,
                    networkLatency: 2000,
                    batteryDrain: 10,
                },
            },
            reporting: {
                format: 'json',
                includeScreenshots: true,
                includeLogs: true,
                aiInsights: true,
                exportPath: './reports',
            },
        },
        production: {
            api: {
                baseUrl: 'https://api.headspin.io',
                apiKey: '',
                timeout: 30000,
                retries: 3,
            },
            ai: {
                enabled: true,
                models: {
                    performance: {
                        name: 'performance-analyzer',
                        version: 'v1.2',
                        threshold: 0.85,
                    },
                    anomaly: {
                        name: 'anomaly-detector',
                        version: 'v2.1',
                        sensitivity: 'medium',
                    },
                    insights: {
                        name: 'insights-generator',
                        version: 'v1.5',
                        categories: ['performance', 'crashes', 'network'],
                    },
                },
                endpoints: {
                    analyze: '/v1/ai/analyze',
                    predict: '/v1/ai/predict',
                    insights: '/v1/ai/insights',
                },
            },
            testing: {
                defaultDevice: 'iPhone 14 Pro',
                defaultLocation: 'US-East',
                timeout: 300000,
                retryOnFailure: true,
                maxRetries: 2,
            },
            monitoring: {
                realTime: true,
                metrics: [
                    'cpu_usage',
                    'memory_usage',
                    'network_latency',
                    'battery_consumption',
                    'thermal_state',
                ],
                alertThresholds: {
                    cpuUsage: 70, // Stricter in production
                    memoryUsage: 75,
                    networkLatency: 2000,
                    batteryDrain: 10,
                },
            },
            reporting: {
                format: 'json',
                includeScreenshots: true,
                includeLogs: true,
                aiInsights: true,
                exportPath: './reports',
            },
        },
    },
};

// Environment-specific configuration merger
const getConfig = (environment: string = process.env.NODE_ENV || 'development'): HeadSpinConfig => {
    const envConfig = config.environments[environment] || {};

    return {
        ...config,
        ...envConfig,
        api: { ...config.api, ...envConfig.api },
        ai: {
            ...config.ai,
            ...envConfig.ai,
            models: { ...config.ai.models, ...envConfig.ai?.models },
        },
        monitoring: {
            ...config.monitoring,
            ...envConfig.monitoring,
            alertThresholds: { ...config.monitoring.alertThresholds, ...envConfig.monitoring?.alertThresholds },
        },
    };
};

export default getConfig();
export { getConfig, config as baseConfig };