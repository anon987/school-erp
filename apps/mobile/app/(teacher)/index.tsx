import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { useAuth } from "@/lib/core/auth/AuthProvider";
import { useTheme } from "@/lib/core/theme/ThemeProvider";
import { getMarkableSections } from "@/lib/attendance/queries";
import type { MarkableSection } from "@/lib/attendance/types";
import { todayIsoIst } from "@/lib/core/dateIst";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { DateField } from "@/components/DateField";
import { EmptyState } from "@/components/EmptyState";
import { LoadingView } from "@/components/LoadingView";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Button } from "@/components/Button";

/**
 * Section picker for the teacher attendance flow -- the screen a class teacher hits first every
 * morning. Deliberately minimal: pick date (defaults to today), pick section, go mark. The 30-
 * second budget (CLAUDE.md) is spent on the marking screen itself, not here.
 */
export default function TeacherHome() {
  const { state, signOut } = useAuth();
  const { colors } = useTheme();
  const [sections, setSections] = useState<MarkableSection[] | null>(null);
  const [date, setDate] = useState<string>(todayIsoIst());
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const session = state.status === "staff" ? state.session : null;

  const load = useCallback(async () => {
    if (!session) return;
    setError(null);
    try {
      setSections(await getMarkableSections(session.schoolId, session.authUserId, session.roles));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your sections.");
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!session) return <LoadingView />;

  return (
    <Screen onRefresh={handleRefresh} refreshing={refreshing}>
      <DateField label="Date" valueIso={date} onChange={setDate} />

      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {sections === null && !error ? <LoadingView /> : null}
      {sections && sections.length === 0 ? (
        <EmptyState message="You don't have any sections to mark attendance for. Contact your admin if this looks wrong." />
      ) : null}

      {sections?.map((s) => (
        <Pressable key={s.sectionId} onPress={() => router.push({ pathname: "/(teacher)/mark/[sectionId]", params: { sectionId: s.sectionId, date } })}>
          <Card style={styles.row}>
            <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 15 }}>
              {s.className} - {s.sectionName}
            </Text>
          </Card>
        </Pressable>
      ))}

      <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
