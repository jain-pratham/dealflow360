export type UserRoleType = "ADMIN" | "SALES_REP" | "SALES_MANAGER" | "FINANCE" | "CUSTOMER";

/**
 * Standardized User Role Display Names across DealFlow360 platform
 */
export function getRoleDisplayName(role?: string | null): string {
  if (!role) return "User";
  switch (role.toUpperCase()) {
    case "ADMIN":
      return "System Admin";
    case "SALES_REP":
      return "Sales Rep";
    case "SALES_MANAGER":
      return "Sales Manager";
    case "FINANCE":
      return "Finance";
    case "CUSTOMER":
      return "Customer";
    default:
      return role;
  }
}
