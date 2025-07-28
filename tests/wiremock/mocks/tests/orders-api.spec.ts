import { test, expect } from '@playwright/test';
import { WiremockHelper } from '../../../utils/wiremock-helper';

test.describe('Orders API with Wiremock', () => {
    let wiremock: WiremockHelper;

    test.beforeAll(async ({ request }) => {
        wiremock = new WiremockHelper(request);

        // Verify Wiremock is running
        const isRunning = await wiremock.isRunning();
        if (!isRunning) {
            throw new Error('Wiremock server is not running on http://localhost:8080');
        }
    });

    test.beforeEach(async () => {
        // Reset stubs before each test
        await wiremock.resetStubs();
    });

    test('should get all orders successfully', async ({ request }) => {
        // Register the orders list stub
        await wiremock.registerStubFromFile('tests/wiremock/mocks/orders-list.json');

        const response = await request.get('/api/orders');

        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('application/json');

        const orders = await response.json();
        expect(Array.isArray(orders)).toBe(true);
        expect(orders).toHaveLength(3);

        // Verify order structure
        const firstOrder = orders[0];
        expect(firstOrder).toHaveProperty('id');
        expect(firstOrder).toHaveProperty('customerId');
        expect(firstOrder).toHaveProperty('status');
        expect(firstOrder).toHaveProperty('total');
        expect(firstOrder).toHaveProperty('items');
        expect(Array.isArray(firstOrder.items)).toBe(true);
    });

    test('should get specific order by ID', async ({ request }) => {
        // Register stub for single order
        await wiremock.registerStub({
            request: {
                method: 'GET',
                urlPattern: '/api/orders/([0-9]+)',
                headers: {
                    'Accept': {
                        contains: 'application/json'
                    }
                }
            },
            response: {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    id: 1001,
                    customerId: 'CUST001',
                    status: 'completed',
                    total: 299.99,
                    orderDate: '2024-01-15T10:30:00Z',
                    items: [
                        {
                            productId: 'PROD001',
                            name: 'Wireless Headphones',
                            quantity: 1,
                            price: 149.99
                        },
                        {
                            productId: 'PROD002',
                            name: 'Phone Case',
                            quantity: 2,
                            price: 75.00
                        }
                    ],
                    shippingAddress: {
                        street: '123 Main St',
                        city: 'Anytown',
                        state: 'CA',
                        zipCode: '12345'
                    }
                }
            }
        });

        const response = await request.get('/api/orders/1001');

        expect(response.status()).toBe(200);
        const order = await response.json();

        expect(order.id).toBe(1001);
        expect(order.customerId).toBe('CUST001');
        expect(order.status).toBe('completed');
        expect(order.total).toBe(299.99);
        expect(order.items).toHaveLength(2);
    });

    test('should create new order successfully', async ({ request }) => {
        // Register stub for order creation
        await wiremock.registerStub({
            request: {
                method: 'POST',
                url: '/api/orders',
                headers: {
                    'Content-Type': {
                        contains: 'application/json'
                    }
                },
                bodyPatterns: [
                    {
                        matchesJsonPath: '$.customerId'
                    },
                    {
                        matchesJsonPath: '$.items[*].productId'
                    }
                ]
            },
            response: {
                status: 201,
                headers: {
                    'Content-Type': 'application/json',
                    'Location': '/api/orders/1004'
                },
                jsonBody: {
                    id: 1004,
                    customerId: 'CUST002',
                    status: 'pending',
                    total: 199.99,
                    orderDate: '2024-01-20T14:45:00Z',
                    items: [
                        {
                            productId: 'PROD003',
                            name: 'Bluetooth Speaker',
                            quantity: 1,
                            price: 199.99
                        }
                    ]
                }
            }
        });

        const newOrder = {
            customerId: 'CUST002',
            items: [
                {
                    productId: 'PROD003',
                    quantity: 1
                }
            ]
        };

        const response = await request.post('/api/orders', {
            data: newOrder
        });

        expect(response.status()).toBe(201);
        expect(response.headers()['location']).toBe('/api/orders/1004');

        const createdOrder = await response.json();
        expect(createdOrder.id).toBe(1004);
        expect(createdOrder.status).toBe('pending');
    });

    test('should handle server error when getting orders', async ({ request }) => {
        // Register error stub
        await wiremock.registerStubFromFile('tests/wiremock/mocks/error-500.json');

        const response = await request.get('/api/orders');

        expect(response.status()).toBe(500);

        const errorResponse = await response.json();
        expect(errorResponse).toHaveProperty('error');
        expect(errorResponse.error.code).toBe('INTERNAL_SERVER_ERROR');
        expect(errorResponse.error.message).toContain('database connection failed');
    });

    test('should handle order not found', async ({ request }) => {
        // Register 404 stub for non-existent order
        await wiremock.registerStub({
            request: {
                method: 'GET',
                urlPattern: '/api/orders/99999'
            },
            response: {
                status: 404,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    error: {
                        code: 'ORDER_NOT_FOUND',
                        message: 'Order with ID 99999 not found',
                        timestamp: '2024-01-20T15:30:00Z'
                    }
                }
            }
        });

        const response = await request.get('/api/orders/99999');

        expect(response.status()).toBe(404);
        const errorResponse = await response.json();
        expect(errorResponse.error.code).toBe('ORDER_NOT_FOUND');
    });

    test('should update order status', async ({ request }) => {
        // Register PUT stub for order update
        await wiremock.registerStub({
            request: {
                method: 'PUT',
                urlPattern: '/api/orders/([0-9]+)/status',
                bodyPatterns: [
                    {
                        equalToJson: '{"status": "shipped"}'
                    }
                ]
            },
            response: {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    id: 1001,
                    customerId: 'CUST001',
                    status: 'shipped',
                    total: 299.99,
                    updatedAt: '2024-01-20T16:00:00Z'
                }
            }
        });

        const response = await request.put('/api/orders/1001/status', {
            data: { status: 'shipped' }
        });

        expect(response.status()).toBe(200);
        const updatedOrder = await response.json();
        expect(updatedOrder.status).toBe('shipped');
        expect(updatedOrder).toHaveProperty('updatedAt');
    });

    test('should delete order', async ({ request }) => {
        // Register DELETE stub
        await wiremock.registerStub({
            request: {
                method: 'DELETE',
                urlPattern: '/api/orders/([0-9]+)'
            },
            response: {
                status: 204
            }
        });

        const response = await request.delete('/api/orders/1001');
        expect(response.status()).toBe(204);
    });

    test('should handle validation errors on order creation', async ({ request }) => {
        // Register validation error stub
        await wiremock.registerStub({
            request: {
                method: 'POST',
                url: '/api/orders',
                bodyPatterns: [
                    {
                        absent: {
                            matchesJsonPath: '$.customerId'
                        }
                    }
                ]
            },
            response: {
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                },
                jsonBody: {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid order data',
                        details: [
                            {
                                field: 'customerId',
                                message: 'Customer ID is required'
                            },
                            {
                                field: 'items',
                                message: 'At least one item is required'
                            }
                        ]
                    }
                }
            }
        });

        const invalidOrder = {
            // Missing customerId and items
        };

        const response = await request.post('/api/orders', {
            data: invalidOrder
        });

        expect(response.status()).toBe(400);
        const errorResponse = await response.json();
        expect(errorResponse.error.code).toBe('VALIDATION_ERROR');
        expect(errorResponse.error.details).toHaveLength(2);
    });

    test.afterEach(async () => {
        // Cleanup after each test
        await wiremock.resetStubs();
    });
});
