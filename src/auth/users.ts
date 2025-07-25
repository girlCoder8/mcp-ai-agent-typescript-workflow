import { generateSecret } from "./totp";

export type Role = "admin" | "salesowner" | "qa";
export interface User {
    username: string;
    password: string;     // In production, always hash!
    role: Role;
    totpSecret: string;
}

const users: User[] = [
    {
        username: "alice",
        password: "alicepw",
        role: "admin",
        totpSecret: generateSecret()
    },
    {
        username: "bob",
        password: "barbpw",
        role: "salesowner",
        totpSecret: generateSecret()
    }
];

export function findUser(username: string): User | undefined {
    return users.find(u => u.username === username);
}
