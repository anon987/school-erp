import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/lib/core/theme/ThemeProvider";

/**
 * The base layout every screen uses: safe-area padding, the theme's background color (no
 * hardcoded hex per CLAUDE.md), and optional pull-to-refresh -- the low-bandwidth-friendly
 * alternative to a background poll for screens that need to reflect a mutation made elsewhere
 * (e.g. a teacher's mark showing up in the parent's attendance history).
 */
export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const { colors } = useTheme();

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flexContent}>{children}</View>
  );

  return <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>{content}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  flexContent: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
});
