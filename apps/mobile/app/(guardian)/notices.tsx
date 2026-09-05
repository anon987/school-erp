import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/core/auth/AuthProvider";
import { useTheme } from "@/lib/core/theme/ThemeProvider";
import { getPortalNotices } from "@/lib/communication/queries";
import type { PortalNoticeRow } from "@/lib/portal/types";
import { formatDateTimeDisplayIst } from "@/lib/core/dateIst";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { LoadingView } from "@/components/LoadingView";
import { ErrorBanner } from "@/components/ErrorBanner";

export default function NoticesScreen() {
  const { state } = useAuth();
  const { colors } = useTheme();
  const [notices, setNotices] = useState<PortalNoticeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const session = state.status === "guardian" ? state.session : null;

  const load = useCallback(async () => {
    if (!session) return;
    setError(null);
    try {
      setNotices(await getPortalNotices(session.guardianId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load notices.");
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
      <Text style={[styles.heading, { color: colors.foreground }]}>Notices</Text>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {notices === null && !error ? <LoadingView /> : null}
      {notices && notices.length === 0 ? <EmptyState message="No notices yet." /> : null}
      {notices?.map((n) => (
        <Card key={n.id}>
          <View style={styles.row}>
            <Text style={[styles.title, { color: colors.foreground }]}>{n.title}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{formatDateTimeDisplayIst(n.createdAt)}</Text>
          </View>
          <Text style={{ color: colors.mutedForeground }}>{n.body}</Text>
        </Card>
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
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
});
