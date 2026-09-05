import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/lib/core/theme/ThemeProvider";
import { Button } from "./Button";

/**
 * Persistent, visible error state -- never a toast that disappears before a teacher on patchy 4G
 * has read it. Pairs with a Retry action so a failed attendance submit never silently drops the
 * marks the teacher already made (CLAUDE.md's offline/connectivity rule): the caller keeps its
 * local state untouched and re-calls the same submit function.
 */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: colors.danger, borderColor: colors.dangerSolid }]}>
      <Text style={[styles.text, { color: colors.dangerForeground }]}>{message}</Text>
      {onRetry ? <Button label="Retry" onPress={onRetry} variant="destructive" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
  },
});
