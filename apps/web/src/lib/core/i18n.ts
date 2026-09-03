/**
 * Minimal placeholder translation lookup. English only for now -- the actual approach (an i18n
 * library vs. DB-stored strings) is an open decision for before P2 (docs/schoolerp_techstack.md
 * §10). What matters for P0 is that no component concatenates sentence fragments or embeds
 * copy in a way that can't be swapped out later; every UI string goes through `t()` and a flat
 * key, even while the dictionary behind it is just this object.
 */
const dictionary = {
  "nav.dashboard": "Dashboard",
  "nav.group.settings": "Settings",
  "nav.school_profile": "School Profile",
  "nav.branding": "Branding",
  "nav.members": "Members & Roles",
  "nav.audit_log": "Audit Log",
  "auth.login.title": "Sign in",
  "auth.login.email_label": "Email",
  "auth.login.password_label": "Password",
  "auth.login.submit": "Sign in",
  "auth.login.error": "Could not sign in. Check your email and password.",
  "auth.logout": "Sign out",
} as const;

export type TranslationKey = keyof typeof dictionary;

export function t(key: TranslationKey): string {
  return dictionary[key];
}
