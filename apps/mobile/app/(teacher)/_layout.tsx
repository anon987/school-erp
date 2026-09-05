import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/lib/core/auth/AuthProvider";
import { useTheme } from "@/lib/core/theme/ThemeProvider";
import { LoadingView } from "@/components/LoadingView";

export default function TeacherLayout() {
  const { state } = useAuth();
  const { colors } = useTheme();

  if (state.status === "loading") return <LoadingView />;
  if (state.status !== "staff") return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.foreground,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Attendance" }} />
      <Stack.Screen name="mark/[sectionId]" options={{ title: "Mark attendance" }} />
    </Stack>
  );
}
