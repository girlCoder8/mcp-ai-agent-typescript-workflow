"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
const users_1 = require("./users");
const totp_1 = require("./totp");
function login(username, password, token) {
    const user = (0, users_1.findUser)(username);
    if (user && user.password === password) {
        // Verify TOTP token
        return (0, totp_1.verifyTOTP)(token, user.totpSecret);
    }
    return false;
}
