import { useState } from "react";
import { Redirect } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/lib/core/auth/AuthProvider";
import { useTheme } from "@/lib/core/theme/ThemeProvider";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/Button";
import { ErrorBanner } from "@/components/ErrorBanner";

/**
 * One sign-in screen for both roles -- role resolution happens after sign-in (see
 * AuthProvider/app/index.tsx), the same "single Expo app" shape as web's single login flow across
 * (app) and (portal). Only handles an ALREADY-ACTIVE account (guardian who completed their invite
 * on web, or any staff member) via plain email+password. The first-time guardian invite-link flow
 * (verifyOtp -> set password -> apps/worker activation) is NOT built here -- see this file's
 * bottom note and the handoff report for why that needs a product decision on deep linking before
 * it can be built without embedding WORKER_INTERNAL_SECRET in a shippable app bundle.
 */
export default function LoginScreen() {
  const { state, signInWithPassword } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (state.status === "guardian" || state.status === "staff") return <Redirect href="/" />;

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    const result = await signInWithPassword(email.trim(), password);
    setLoading(false);
    if (result.error) setError("Could not sign in. Check your email and password.");
  }

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>School ERP</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Sign in to continue</Text>
      </View>

      {error ? <ErrorBanner message={error} /> : null}

      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
        placeholder="Email"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
        placeholder="Password"
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
      />
      <Button label="Sign in" onPress={() => void handleSignIn()} loading={loading} disabled={!email || !password} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 48,
    marginBottom: 16,
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
});
