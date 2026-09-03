import type { AuthMethod } from "./types";

/**
 * Decides which login method applies. The signature takes school/role context on purpose: the
 * caller (the login page/server action) never hardcodes "email_password" -- it asks this
 * function, which is the one place that would change when a school or role gets phone+OTP
 * enabled.
 *
 * P0 has exactly one live strategy, so this always resolves to it. The extension point for
 * later is a per-school or per-role config value (e.g. a school_module_flag row, or a column
 * added when phone+OTP ships) -- deliberately not invented here ahead of need.
 */
export function resolveAuthMethod(_context: { schoolId?: string; roleKey?: string }): AuthMethod {
  return "email_password";
}
