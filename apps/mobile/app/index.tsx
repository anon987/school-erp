import { Redirect } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "@/lib/core/auth/AuthProvider";
import { useTheme } from "@/lib/core/theme/ThemeProvider";
import { Screen } from "@/components/Screen";
import { LoadingView } from "@/components/LoadingView";
import { Button } from "@/components/Button";

/**
 * Role-based entry redirect -- resolves once AuthProvider knows what this authenticated user is
 * (guardian vs staff, see CLAUDE.md's single-app decision) and sends them to the right route
 * group. `unresolved` is a real, user-facing state: signed in but neither a guardian_portal_account
 * nor a school_member row exists for this account -- shown rather than silently stuck loading.
 */
export default function Index() {
  const { state, signOut } = useAuth();
  const { colors } = useTheme();

  if (state.status === "loading") return <LoadingView />;
  if (state.status === "signedOut") return <Redirect href="/login" />;
  if (state.status === "guardian") return <Redirect href="/(guardian)" />;
  if (state.status === "staff") return <Redirect href="/(teacher)" />;

  return (
    <Screen scroll={false}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: colors.foreground }}>Account not set up</Text>
      <Text style={{ marginTop: 8, color: colors.mutedForeground }}>
        This account isn't registered as a parent/guardian or a staff member for any school. Contact your school's admin if you believe this is a
        mistake.
      </Text>
      <Button label="Sign out" onPress={() => void signOut()} variant="secondary" />
    </Screen>
  );
}
