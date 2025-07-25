import { authenticator, totp } from "otplib";

export function generateSecret(): string {
    return authenticator.generateSecret(); // Fixed: use authenticator, not totp
}

export function generateTOTP(secret: string): string {
    return totp.generate(secret);
}

export function verifyTOTP(token: string, secret: string): boolean {
    return totp.check(token, secret);
}
