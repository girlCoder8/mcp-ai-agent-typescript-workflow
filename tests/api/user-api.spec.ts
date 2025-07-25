import { test, expect } from '@playwright/test';


const BASE_URL = 'https://jsonplaceholder.typicode.com';

test.describe('User API', () => {
    test('should return a list of users', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/users`);
        expect(response.status()).toBe(200);
        const users = await response.json();
        expect(Array.isArray(users)).toBeTruthy();
        expect(users.length).toBeGreaterThan(0);
        expect(users[0]).toHaveProperty('id');
        expect(users[0]).toHaveProperty('name');
    });

    test('should return a specific user', async ({ request }) => {
        const response = await request.get(`${BASE_URL}/users/1`);
        expect(response.status()).toBe(200);
        const user = await response.json();
        expect(user).toHaveProperty('id', 1);
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('email');
    });

    test('should create a new user (demo)', async ({ request }) => {
        const newUser = {
            name: 'Jane Doe',
            username: 'janedoe',
            email: 'janedoe@example.com',
        };

        const response = await request.post(`${BASE_URL}/users`, {
            data: newUser,
        });
        expect(response.status()).toBe(201);
        const createdUser = await response.json();
        expect(createdUser).toMatchObject(newUser);
        expect(createdUser).toHaveProperty('id');
    });
});
