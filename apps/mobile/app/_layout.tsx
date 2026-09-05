import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/core/auth/AuthProvider";
import { ThemeProvider, useTheme } from "@/lib/core/theme/ThemeProvider";

/**
 * app/ stays thin per CLAUDE.md's organization rule -- every screen's logic lives in src/lib/,
 * this file only wires up the two providers (theme, auth) and the top-level Stack. Route groups
 * below mirror the web app's single-deployable split: (guardian) = parent/student portal,
 * (teacher) = staff attendance marking. A single person is never both (see AuthProvider).
 */
export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootStack />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootStack() {
  const { resolvedScheme, colors } = useTheme();
  return (
    <>
      <StatusBar style={resolvedScheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.foreground, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(guardian)" options={{ headerShown: false }} />
        <Stack.Screen name="(teacher)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
