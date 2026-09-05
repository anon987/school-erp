import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { type ColorTokens, darkTokens, lightTokens } from "./tokens";

/**
 * Per-user dark mode (light/dark/system), stored locally against the device -- the mobile
 * equivalent of the web app's per-user theme preference (docs/schoolerp_techstack.md §7a). Per-
 * school branding (--primary/--accent override) is NOT wired up here yet: that requires fetching
 * the school's branding row (apps/web/src/lib/core/school/getSchoolBranding.ts) which needs a
 * resolved school_id, and a guardian session's school_id comes from `guardian_portal_account`
 * rather than JWT claims -- doable, but deliberately deferred to keep this pass's scope to the
 * portal + attendance screens themselves. Every screen already reads colors from this provider,
 * so wiring the school's `primary`/`accent` override in later is a token-value change here, not a
 * per-screen rewrite.
 */
export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "schoolerp.themePreference";

interface ThemeContextValue {
  colors: ColorTokens;
  resolvedScheme: "light" | "dark";
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") setPreferenceState(stored);
      })
      .finally(() => setHydrated(true));
  }, []);

  function setPreference(pref: ThemePreference) {
    setPreferenceState(pref);
    void AsyncStorage.setItem(STORAGE_KEY, pref);
  }

  const resolvedScheme: "light" | "dark" = preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;
  const colors = resolvedScheme === "dark" ? darkTokens : lightTokens;

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, resolvedScheme, preference, setPreference }),
    [colors, resolvedScheme, preference],
  );

  // Render immediately with the "system" default rather than blocking on AsyncStorage --
  // avoids a flash-of-wrong-theme on the FIRST frame would require blocking startup on disk I/O,
  // which is worse for the low-end-device target than very occasionally rendering one frame
  // before the stored preference (if not "system") swaps in.
  void hydrated;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
