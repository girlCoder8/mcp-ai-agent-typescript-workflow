import { findUser } from "./users";
import { verifyTOTP } from "./totp";

export function login(username: string, password: string, token: string): boolean {
    const user = findUser(username);
    if (user && user.password === password) {
        // Verify TOTP token
        return verifyTOTP(token, user.totpSecret);
    }
    return false;
}
