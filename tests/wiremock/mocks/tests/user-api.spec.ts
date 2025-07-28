// wiremock-helper.ts - For external Wiremock server
import { request, APIRequestContext } from '@playwright/test';

export class WiremockHelper {
    private static readonly WIREMOCK_PORT = 8080;
    private static readonly WIREMOCK_URL = `http://localhost:${WiremockHelper.WIREMOCK_PORT}`;
    private apiRequestContext: APIRequestContext | null = null;

    constructor() {
        // No server startup needed - assumes an external server is running
    }

    // Check if the external Wiremock server is running
    static async startWiremock(): Promise<void> {
        console.log('Checking if external Wiremock server is running...');

        try {
            const context = await request.newContext();
            const response = await context.get(`${WiremockHelper.WIREMOCK_URL}/__admin/health`);
            await context.dispose();

            if (response.ok()) {
                console.log('✅ External Wiremock server is running and ready');
                return;
            } else {
                throw new Error(`Wiremock health check failed: ${response.status()}`);
            }
        } catch (error) {
            console.error('❌ External Wiremock server is not running or not accessible');
            console.error('Please start Wiremock server first:');
            console.error('  Option 1: docker run -p 8080:8080 wiremock/wiremock:latest');
            console.error('  Option 2: java -jar wiremock-standalone.jar --port 8080');
            console.error('  Option 3: npm install -g wiremock && wiremock --port 8080');
            throw new Error(`Cannot connect to Wiremock server at ${WiremockHelper.WIREMOCK_URL}: ${error}`);
        }
    }

    static async stopWiremock(): Promise<void> {
        console.log('External Wiremock server management not handled by tests');
        console.log('Please stop the server manually when done');
    }

    // Wait for Wiremock to be ready with retries
    static async waitForWiremock(maxAttempts?: number, intervalMs?: number): Promise<void> {
        const attempts = maxAttempts || 30;
        const interval = intervalMs || 1000;
        console.log(`Waiting for Wiremock server to be ready (max ${attempts} attempts)...`);

        for (let i = 0; i < attempts; i++) {
            try {
                const context = await request.newContext();
                const response = await context.get(`${WiremockHelper.WIREMOCK_URL}/__admin/health`);
                await context.dispose();

                if (response.ok()) {
                    console.log(`✅ Wiremock server is ready! (attempt ${i + 1})`);
                    return;
                }
            } catch (error) {
                // Server is not ready yet, continue waiting
            }

            console.log(`⏳ Waiting for Wiremock... attempt ${i + 1}/${attempts}`);
            await new Promise(resolve => setTimeout(resolve, interval));
        }

        throw new Error(`Wiremock server did not become ready within ${attempts * interval / 1000} seconds`);
    }

    // Get API request context with proper headers
    async getApiRequestContext(): Promise<APIRequestContext> {
        if (!this.apiRequestContext) {
            this.apiRequestContext = await request.newContext({
                baseURL: WiremockHelper.WIREMOCK_URL,
                extraHTTPHeaders: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Test-Run-ID': process.env.TEST_RUN_ID || 'local-run',
                    'X-AI-Enhanced': 'true',
                    'X-Test-Type': 'wiremock'
                },
                timeout: 10000 // 10-second timeout
            });
        }
        return this.apiRequestContext;
    }

    // Reset all stubs and mappings
    async resetStubs(): Promise<void> {
        try {
            const context = await this.getApiRequestContext();
            const response = await context.post('/__admin/reset');

            if (!response.ok()) {
                const errorText = await response.text();
                throw new Error(`Failed to reset stubs: ${response.status()} ${response.statusText()}\n${errorText}`);
            }

            console.log('🧹 Wiremock stubs reset successfully');
        } catch (error) {
            console.error('❌ Error resetting Wiremock stubs:', error);
            throw error;
        }
    }

    // Create a new stub mapping
    async createStub(stubMapping: any): Promise<void> {
        try {
            const context = await this.getApiRequestContext();
            const response = await context.post('/__admin/mappings', {
                data: stubMapping
            });

            if (!response.ok()) {
                const errorText = await response.text();
                throw new Error(`Failed to create stub: ${response.status()} ${response.statusText()}\n${errorText}`);
            }

            const responseData = await response.json();
            console.log('✅ Stub created successfully:', responseData.id || 'unknown-id');
        } catch (error) {
            console.error('❌ Error creating stub:', error);
            console.error('Stub mapping:', JSON.stringify(stubMapping, null, 2));
            throw error;
        }
    }

    // Get all current stubs
    async getAllStubs(): Promise<any> {
        try {
            const context = await this.getApiRequestContext();
            const response = await context.get('/__admin/mappings');

            if (!response.ok()) {
                throw new Error(`Failed to get stubs: ${response.status()} ${response.statusText()}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Error getting stubs:', error);
            throw error;
        }
    }

    // Delete a specific stub by ID
    async deleteStub(stubId: string): Promise<void> {
        try {
            const context = await this.getApiRequestContext();
            const response = await context.delete(`/__admin/mappings/${stubId}`);

            if (!response.ok()) {
                throw new Error(`Failed to delete stub: ${response.status()} ${response.statusText()}`);
            }

            console.log(`🗑️ Stub ${stubId} deleted successfully`);
        } catch (error) {
            console.error('❌ Error deleting stub:', error);
            throw error;
        }
    }

    // Get request logs/journal
    async getRequestJournal(): Promise<any> {
        try {
            const context = await this.getApiRequestContext();
            const response = await context.get('/__admin/requests');

            if (!response.ok()) {
                throw new Error(`Failed to get request journal: ${response.status()} ${response.statusText()}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Error getting request journal:', error);
            throw error;
        }
    }

    // Clear request journal
    async clearRequestJournal(): Promise<void> {
        try {
            const context = await this.getApiRequestContext();
            const response = await context.delete('/__admin/requests');

            if (!response.ok()) {
                throw new Error(`Failed to clear request journal: ${response.status()} ${response.statusText()}`);
            }

            console.log('🧹 Request journal cleared');
        } catch (error) {
            console.error('❌ Error clearing request journal:', error);
            throw error;
        }
    }

    // Get server info and settings
    async getServerInfo1(): Promise<any> {
        try {
            const context = await this.getApiRequestContext();

            // Get multiple endpoints for comprehensive info
            const [settingsResponse, mappingsResponse] = await Promise.all([
                context.get('/__admin/settings'),
                context.get('/__admin/mappings')
            ]);

            return {
                settings: settingsResponse.ok() ? await settingsResponse.json() : null,
                mappingsCount: mappingsResponse.ok() ? (await mappingsResponse.json()).mappings?.length || 0 : 0,
                serverUrl: WiremockHelper.WIREMOCK_URL,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error getting server info:', error);
            throw error;
        }
    }

    // Helper method to create user stubs easily
    async createUserStub(userId: number, userData: any, status: number = 200): Promise<void> {
        const stubMapping = {
            request: {
                method: 'GET',
                urlPath: `/api/users/${userId}`
            },
            response: {
                status,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: userData
            }
        };

        await this.createStub(stubMapping);
    }

    // Helper method to create error responses
    async createErrorStub(urlPath: string, method: string = 'GET', status: number = 500, errorMessage: string = 'Internal Server Error'): Promise<void> {
        const stubMapping = {
            request: {
                method: method.toUpperCase(),
                urlPath
            },
            response: {
                status,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    error: errorMessage,
                    status,
                    timestamp: new Date().toISOString()
                }
            }
        };

        await this.createStub(stubMapping);
    }

    // Check server status and configuration
    async getServerInfo2(): Promise<any> {
        try {
            const context = await this.getApiRequestContext();

            // Get multiple endpoints for comprehensive info
            const [settingsResponse, mappingsResponse] = await Promise.all([
                context.get('/__admin/settings'),
                context.get('/__admin/mappings')
            ]);

            return {
                settings: settingsResponse.ok() ? await settingsResponse.json() : null,
                mappingsCount: mappingsResponse.ok() ? (await mappingsResponse.json()).mappings?.length || 0 : 0,
                serverUrl: WiremockHelper.WIREMOCK_URL,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error getting server info:', error);
            throw error;
        }
    }

    // Cleanup method
    async dispose(): Promise<void> {
        if (this.apiRequestContext) {
            await this.apiRequestContext.dispose();
            this.apiRequestContext = null;
            console.log('🧹 API request context disposed');
        }
    }
}