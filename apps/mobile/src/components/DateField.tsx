import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@/lib/core/theme/ThemeProvider";
import { formatDateDisplay } from "@/lib/core/dateIst";

/**
 * Native date picker wrapped to always emit/display dd/mm/yyyy (CLAUDE.md) regardless of the
 * device's OS locale -- the native Android/iOS picker UI itself follows the device locale (no
 * override exists for that, same limitation CLAUDE.md documents for web's <input type="date">),
 * but the VALUE this component hands back and displays as text is always formatted via
 * formatDateDisplay, never the OS's own rendering.
 */
export function DateField({ label, valueIso, onChange }: { label: string; valueIso: string | null; onChange: (iso: string) => void }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const dateValue = valueIso ? new Date(`${valueIso}T00:00:00`) : new Date();

  function handleChange(event: { type: string }, selected?: Date) {
    if (Platform.OS === "android") setOpen(false);
    if (event.type === "dismissed" || !selected) return;
    const iso = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}`;
    onChange(iso);
  }

  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={[styles.field, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={{ color: valueIso ? colors.foreground : colors.mutedForeground }}>{valueIso ? formatDateDisplay(valueIso) : "Select a date"}</Text>
      </Pressable>
      {open ? <DateTimePicker value={dateValue} mode="date" display={Platform.OS === "ios" ? "inline" : "default"} onChange={handleChange} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
