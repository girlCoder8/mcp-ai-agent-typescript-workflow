import { APIRequestContext, request } from '@playwright/test';
import { execSync, spawn, ChildProcess } from 'child_process';

export class WiremockHelper {
    private static wiremockProcess: ChildProcess | null = null;
    private static readonly WIREMOCK_PORT = 8080;
    private static readonly WIREMOCK_URL = `http://localhost:${WiremockHelper.WIREMOCK_PORT}`;
    private apiRequestContext: APIRequestContext | null = null;

    constructor() {
        // Constructor implementation if needed
    }

    // Static method to start Wiremock server
    static async startWiremock(): Promise<void> {
        if (await WiremockHelper.isWiremockRunning()) {
            console.log('Wiremock is already running');
            return;
        }

        console.log('🚀Starting Wiremock server...');

        try {
            // Option 1: Using Docker (recommended)
            WiremockHelper.wiremockProcess = spawn('docker', [
                'run', '--rm', '-p', `${WiremockHelper.WIREMOCK_PORT}:8080`,
                'wiremock/wiremock:latest'
            ], {
                stdio: 'pipe',
                detached: false
            });

            // Handle process events
            WiremockHelper.wiremockProcess.on('error', (error) => {
                console.error('Failed to start Wiremock:', error);
                throw error;
            });

            // Wait for Wiremock to be ready
            await WiremockHelper.waitForWiremock();
            console.log('Wiremock server started successfully');
        } catch (error) {
            console.error('Error starting Wiremock:', error);
            throw error;
        }
    }

    // Static method to stop Wiremock server
    static async stopWiremock(): Promise<void> {
        if (WiremockHelper.wiremockProcess) {
            console.log('Stopping Wiremock server...');
            WiremockHelper.wiremockProcess.kill('SIGTERM');
            WiremockHelper.wiremockProcess = null;
        }

        // Alternative: Stop Docker container by name if you're using named containers
        try {
            execSync('docker stop wiremock-test-container 2>/dev/null || true', { stdio: 'ignore' });
        } catch {
            // Ignore errors if container doesn't exist
        }
    }

    // Check if Wiremock is running
    private static async isWiremockRunning(): Promise<boolean> {
        try {
            const context = await request.newContext();
            const response = await context.get(`${WiremockHelper.WIREMOCK_URL}/__admin/health`);
            await context.dispose();
            return response.ok();
        } catch {
            return false;
        }
    }

    // Wait for Wiremock to be ready
    private static async waitForWiremock(maxAttempts = 30): Promise<void> {
        for (let i = 0; i < maxAttempts; i++) {
            if (await WiremockHelper.isWiremockRunning()) {
                console.log('Wiremock is ready!');
                return;
            }
            console.log(`Waiting for Wiremock... attempt ${i + 1}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        throw new Error('Wiremock failed to start within expected time');
    }

    // Instance method to get API request context
    async getApiRequestContext(): Promise<APIRequestContext> {
        if (!this.apiRequestContext) {
            this.apiRequestContext = await request.newContext({
                baseURL: WiremockHelper.WIREMOCK_URL,
                extraHTTPHeaders: {
                    'Content-Type': 'application/json',
                    'X-Test-Run-ID': 'local-run',
                    'X-AI-Enhanced': 'true',
                    'X-Test-Type': 'wiremock'
                }
            });
        }
        return this.apiRequestContext;
    }

    // Reset all stubs
    async resetStubs(): Promise<void> {
        try {
            const context = await this.getApiRequestContext();
            const response = await context.post('/__admin/reset');

            if (!response.ok()) {
                throw new Error(`Failed to reset stubs: ${response.status()} ${response.statusText()}`);
            }

            console.log('Wiremock stubs reset successfully');
        } catch (error) {
            console.error('Error resetting Wiremock stubs:', error);
            throw error;
        }
    }

    // Create a stub
    async createStub(stubMapping: any): Promise<void> {
        try {
            const context = await this.getApiRequestContext();
            const response = await context.post('/__admin/mappings', {
                data: stubMapping
            });

            if (!response.ok()) {
                throw new Error(`Failed to create stub: ${response.status()} ${response.statusText()}`);
            }

            console.log('Stub created successfully');
        } catch (error) {
            console.error('Error creating stub:', error);
            throw error;
        }
    }

    // Get all stubs
    async getAllStubs(): Promise<any> {
        try {
            const context = await this.getApiRequestContext();
            const response = await context.get('/__admin/mappings');

            if (!response.ok()) {
                throw new Error(`Failed to get stubs: ${response.status()} ${response.statusText()}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting stubs:', error);
            throw error;
        }
    }

    // Cleanup method
    async dispose(): Promise<void> {
        if (this.apiRequestContext) {
            await this.apiRequestContext.dispose();
            this.apiRequestContext = null;
        }
    }
}

