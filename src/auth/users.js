"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUser = findUser;
const totp_1 = require("./totp");
const users = [
    {
        username: "alice",
        password: "alicepw",
        role: "admin",
        totpSecret: (0, totp_1.generateSecret)()
    },
    {
        username: "bob",
        password: "barbpw",
        role: "salesowner",
        totpSecret: (0, totp_1.generateSecret)()
    }
];
function findUser(username) {
    return users.find(u => u.username === username);
}
