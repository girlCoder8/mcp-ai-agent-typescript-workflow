import { test, expect } from '@playwright/test';
import { generateSecret, generateTOTP, verifyTOTP } from '../../src/auth/totp';

test('TOTP can be generated and verified', () => {
    const secret = generateSecret();
    const token = generateTOTP(secret);
    expect(verifyTOTP(token, secret)).toBe(true);
});
