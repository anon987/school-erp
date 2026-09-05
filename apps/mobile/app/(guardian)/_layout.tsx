import { Redirect, Tabs } from "expo-router";
import { Bell, Home, User } from "lucide-react-native";
import { useAuth } from "@/lib/core/auth/AuthProvider";
import { useTheme } from "@/lib/core/theme/ThemeProvider";
import { LoadingView } from "@/components/LoadingView";

export default function GuardianLayout() {
  const { state } = useAuth();
  const { colors } = useTheme();

  if (state.status === "loading") return <LoadingView />;
  if (state.status !== "guardian") return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.foreground,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Your children", tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="notices" options={{ title: "Notices", tabBarIcon: ({ color, size }) => <Bell color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
      <Tabs.Screen name="students/[studentId]" options={{ href: null, title: "Student" }} />
    </Tabs>
  );
}
