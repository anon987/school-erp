import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/lib/core/theme/ThemeProvider";

export function EmptyState({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: colors.mutedForeground }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 32,
    alignItems: "center",
  },
  text: {
    fontSize: 14,
    textAlign: "center",
  },
});
