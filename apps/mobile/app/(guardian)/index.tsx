import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/core/auth/AuthProvider";
import { useTheme } from "@/lib/core/theme/ThemeProvider";
import { getLinkedStudents } from "@/lib/portal/queries";
import type { LinkedStudentRow } from "@/lib/portal/types";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { LoadingView } from "@/components/LoadingView";
import { ErrorBanner } from "@/components/ErrorBanner";

export default function GuardianDashboard() {
  const { state } = useAuth();
  const { colors } = useTheme();
  const [students, setStudents] = useState<LinkedStudentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const session = state.status === "guardian" ? state.session : null;

  const load = useCallback(async () => {
    if (!session) return;
    setError(null);
    try {
      const rows = await getLinkedStudents(session.schoolId, session.guardianId);
      setStudents(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your children.");
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
      <Text style={[styles.heading, { color: colors.foreground }]}>Your children</Text>

      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      {students === null && !error ? <LoadingView /> : null}

      {students && students.length === 0 ? <EmptyState message="No students are linked to this account yet." /> : null}

      {students?.map((s) => (
        <Pressable key={s.id} onPress={() => router.push(`/(guardian)/students/${s.id}`)}>
          <Card style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.foreground }]}>
                {s.firstName} {s.lastName}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Admission no. {s.admissionNumber}</Text>
            </View>
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{s.className ? `${s.className}${s.sectionName ? ` - ${s.sectionName}` : ""}` : "—"}</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
});
