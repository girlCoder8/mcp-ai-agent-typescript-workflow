"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const totp_1 = require("../../src/auth/totp");
(0, test_1.test)('TOTP can be generated and verified', () => {
    const secret = (0, totp_1.generateSecret)();
    const token = (0, totp_1.generateTOTP)(secret);
    (0, test_1.expect)((0, totp_1.verifyTOTP)(token, secret)).toBe(true);
});
