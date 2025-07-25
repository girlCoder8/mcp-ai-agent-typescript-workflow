"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecret = generateSecret;
exports.generateTOTP = generateTOTP;
exports.verifyTOTP = verifyTOTP;
const otplib_1 = require("otplib");
function generateSecret() {
    return otplib_1.authenticator.generateSecret(); // Fixed: use authenticator, not totp
}
function generateTOTP(secret) {
    return otplib_1.totp.generate(secret);
}
function verifyTOTP(token, secret) {
    return otplib_1.totp.check(token, secret);
}
