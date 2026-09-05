import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/core/auth/AuthProvider";
import { useTheme, type ThemePreference } from "@/lib/core/theme/ThemeProvider";
import { getGuardianProfile } from "@/lib/portal/queries";
import type { GuardianProfile } from "@/lib/portal/types";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingView } from "@/components/LoadingView";
import { ErrorBanner } from "@/components/ErrorBanner";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function ProfileScreen() {
  const { state, signOut } = useAuth();
  const { colors, preference, setPreference } = useTheme();
  const [profile, setProfile] = useState<GuardianProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const session = state.status === "guardian" ? state.session : null;

  const load = useCallback(async () => {
    if (!session) return;
    setError(null);
    try {
      setProfile(await getGuardianProfile(session.guardianId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your profile.");
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!session) return <LoadingView />;

  return (
    <Screen>
      <Text style={[styles.heading, { color: colors.foreground }]}>Your profile</Text>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      {profile ? (
        <Card>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {profile.firstName} {profile.lastName ?? ""}
          </Text>
          <Text style={{ color: colors.mutedForeground }}>{profile.email ?? "No email on file"}</Text>
          <View style={{ marginTop: 8, gap: 4 }}>
            {profile.links.map((l) => (
              <Text key={l.studentId} style={{ color: colors.mutedForeground, fontSize: 13 }}>
                {l.relationshipType} of {l.studentName}
                {l.phone ? ` · ${l.phone}` : ""}
              </Text>
            ))}
          </View>
        </Card>
      ) : null}

      <Card>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Appearance</Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              label={opt.label}
              variant={preference === opt.value ? "primary" : "secondary"}
              onPress={() => setPreference(opt.value)}
            />
          ))}
        </View>
      </Card>

      <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 20,
    fontWeight: "700",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  themeRow: {
    flexDirection: "row",
    gap: 8,
  },
});
