export type Role = "admin" | "developer" | "qa";

export function hasRole(userRole: string, requiredRole: Role): boolean {
    return userRole === requiredRole;
}
