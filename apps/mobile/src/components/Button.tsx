import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/lib/core/theme/ThemeProvider";

type Variant = "primary" | "secondary" | "destructive" | "ghost";

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: colors.primaryForeground },
    secondary: { bg: colors.secondary, fg: colors.secondaryForeground, border: colors.border },
    destructive: { bg: colors.destructive, fg: colors.destructiveForeground },
    ghost: { bg: "transparent", fg: colors.foreground, border: colors.border },
  };
  const { bg, fg, border } = palette[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderColor: border ?? "transparent", borderWidth: border ? 1 : 0, opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.label, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48, // comfortable tap target on a low-end phone, not the 32-36px web default
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
});
