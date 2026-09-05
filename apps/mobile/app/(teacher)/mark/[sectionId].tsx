import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/lib/core/auth/AuthProvider";
import { useTheme } from "@/lib/core/theme/ThemeProvider";
import { hasPermission } from "@/lib/core/auth/permissions";
import { getSectionRoster } from "@/lib/attendance/queries";
import { markSectionAttendance } from "@/lib/attendance/actions";
import type { AttendanceStatus, SectionRosterResult } from "@/lib/attendance/types";
import { todayIsoIst } from "@/lib/core/dateIst";
import { Button } from "@/components/Button";
import { LoadingView } from "@/components/LoadingView";
import { ErrorBanner } from "@/components/ErrorBanner";

const STATUS_OPTIONS: { value: AttendanceStatus; short: string }[] = [
  { value: "present", short: "P" },
  { value: "absent", short: "A" },
  { value: "late", short: "L" },
  { value: "half_day", short: "H" },
  { value: "leave", short: "Lv" },
];

const DRAFT_PREFIX = "schoolerp.attendanceDraft:";
const DRAFT_MAX_AGE_MS = 48 * 60 * 60 * 1000;

interface Mark {
  status: AttendanceStatus;
  remarks?: string;
}

interface DraftShape {
  savedAt: string;
  marks: Record<string, Mark>;
}

/** Same key shape as apps/web/src/lib/attendance/components/MarkingClient.tsx -- authUserId in
 *  the key so a shared staff phone doesn't restore one teacher's in-progress draft for the next
 *  person to open the same section/date. */
function draftKey(sectionId: string, attendanceDate: string, authUserId: string): string {
  return `${DRAFT_PREFIX}${sectionId}:${attendanceDate}:${authUserId}`;
}

async function pruneStaleDrafts(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const draftKeys = keys.filter((k) => k.startsWith(DRAFT_PREFIX));
  if (draftKeys.length === 0) return;
  const entries = await AsyncStorage.multiGet(draftKeys);
  const now = Date.now();
  const toRemove: string[] = [];
  for (const [key, raw] of entries) {
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as DraftShape;
      if (now - new Date(parsed.savedAt).getTime() > DRAFT_MAX_AGE_MS) toRemove.push(key);
    } catch {
      toRemove.push(key);
    }
  }
  if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
}

/**
 * The screen the CLAUDE.md hard requirement is about: mark 60 students in under 30 seconds,
 * default everyone present, tap only exceptions. Ported from
 * apps/web/src/lib/attendance/components/MarkingClient.tsx -- same status short-codes, same
 * local-draft-survives-a-crash behaviour (AsyncStorage here instead of localStorage), same
 * editable/locked split for students already marked in another section today. The submit button
 * never disables itself away after a failure: a failed submit keeps every tap intact (still in
 * `marks` state AND in the AsyncStorage draft) so a flaky-4G failure never silently drops a
 * teacher's work -- see ErrorBanner's onRetry.
 */
export default function MarkAttendanceScreen() {
  const { sectionId, date } = useLocalSearchParams<{ sectionId: string; date?: string }>();
  const { state } = useAuth();
  const { colors } = useTheme();

  const session = state.status === "staff" ? state.session : null;
  const attendanceDate = date ?? todayIsoIst();

  const [roster, setRoster] = useState<SectionRosterResult | null>(null);
  const [canForceEdit, setCanForceEdit] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [acknowledgedNonTeaching, setAcknowledgedNonTeaching] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [skippedOtherSection, setSkippedOtherSection] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const draftLoadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!session || !sectionId) return;
    setLoadError(null);
    try {
      const [rosterResult, manage] = await Promise.all([
        getSectionRoster(session.schoolId, sectionId, attendanceDate),
        hasPermission(session.roles, "attendance.manage"),
      ]);
      setRoster(rosterResult);
      setCanForceEdit(manage);

      const editableStudents = rosterResult.students.filter((s) => !s.markedInOtherSection);
      const initial: Record<string, Mark> = {};
      for (const s of editableStudents) initial[s.studentId] = { status: s.existingStatus ?? "present" };

      if (!draftLoadedRef.current) {
        draftLoadedRef.current = true;
        await pruneStaleDrafts();
        const raw = await AsyncStorage.getItem(draftKey(sectionId, attendanceDate, session.authUserId));
        if (raw) {
          try {
            const draft = JSON.parse(raw) as DraftShape;
            if (Date.now() - new Date(draft.savedAt).getTime() <= DRAFT_MAX_AGE_MS) {
              setMarks({ ...initial, ...draft.marks });
              return;
            }
          } catch {
            // fall through to server-derived initial state
          }
        }
      }
      setMarks(initial);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load this section's roster.");
    }
  }, [session, sectionId, attendanceDate]);

  useEffect(() => {
    void load();
  }, [load]);

  // Debounced local persistence -- every tap updates state instantly (no network call); this just
  // mirrors it to AsyncStorage so an accidental app kill mid-marking doesn't lose progress.
  useEffect(() => {
    if (!session || !sectionId || Object.keys(marks).length === 0) return;
    const timeout = setTimeout(() => {
      const draft: DraftShape = { savedAt: new Date().toISOString(), marks };
      void AsyncStorage.setItem(draftKey(sectionId, attendanceDate, session.authUserId), JSON.stringify(draft));
    }, 250);
    return () => clearTimeout(timeout);
  }, [marks, session, sectionId, attendanceDate]);

  const editableStudents = useMemo(() => roster?.students.filter((s) => !s.markedInOtherSection) ?? [], [roster]);
  const lockedStudents = useMemo(() => roster?.students.filter((s) => s.markedInOtherSection) ?? [], [roster]);
  const editable = roster ? canForceEdit || roster.isToday : false;

  const summary = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0 };
    for (const mark of Object.values(marks)) counts[mark.status] += 1;
    return counts;
  }, [marks]);

  function setStatus(studentId: string, status: AttendanceStatus) {
    setMarks((current) => ({ ...current, [studentId]: { ...current[studentId], status } }));
  }

  async function handleSubmit() {
    if (!session || !roster) return;
    setSubmitting(true);
    setSubmitError(null);
    setSaved(false);
    const result = await markSectionAttendance(session, {
      sectionId: roster.sectionId,
      attendanceDate: roster.attendanceDate,
      marks: editableStudents.map((s) => ({ studentId: s.studentId, status: marks[s.studentId]?.status ?? "present" })),
    });
    setSubmitting(false);
    if (result.error) {
      setSubmitError(result.error);
      return;
    }
    setSkippedOtherSection(result.skippedOtherSection ?? []);
    setSaved(true);
    await AsyncStorage.removeItem(draftKey(roster.sectionId, roster.attendanceDate, session.authUserId));
  }

  if (!session) return <LoadingView />;
  if (loadError) return <ErrorBanner message={loadError} onRetry={load} />;
  if (!roster) return <LoadingView />;

  const totalToMark = editableStudents.length;
  const markedCount = Object.keys(marks).length;
  const canSubmit = editable && !submitting && !(roster.isNonTeachingDay && !acknowledgedNonTeaching) && totalToMark > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: `${roster.className} - ${roster.sectionName}` }} />

      {roster.isNonTeachingDay ? (
        <View style={[styles.notice, { backgroundColor: colors.warning }]}>
          <Text style={{ color: colors.warningForeground }}>
            {roster.nonTeachingDayLabel ?? "Non-teaching day"} -- this date is a declared holiday or a Sunday.
          </Text>
          <Pressable style={styles.checkboxRow} onPress={() => setAcknowledgedNonTeaching((v) => !v)}>
            <View style={[styles.checkbox, { borderColor: colors.warningForeground, backgroundColor: acknowledgedNonTeaching ? colors.warningForeground : "transparent" }]} />
            <Text style={{ color: colors.warningForeground }}>Mark anyway</Text>
          </Pressable>
        </View>
      ) : null}

      {!editable ? (
        <View style={[styles.notice, { backgroundColor: colors.secondary }]}>
          <Text style={{ color: colors.secondaryForeground }}>Only today can be marked or corrected here. Ask an admin for changes to a past date.</Text>
        </View>
      ) : null}

      <View style={[styles.summaryBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {STATUS_OPTIONS.map((opt) => (
          <Text key={opt.value} style={{ color: colors.mutedForeground, fontSize: 12 }}>
            {opt.short}: <Text style={{ color: colors.foreground, fontWeight: "700" }}>{summary[opt.value]}</Text>
          </Text>
        ))}
        <Text style={{ color: colors.mutedForeground, fontSize: 12, marginLeft: "auto" }}>
          {markedCount} of {totalToMark}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {editableStudents.map((s) => (
          <View key={s.studentId} style={[styles.studentRow, { borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontWeight: "500" }}>
                {s.firstName} {s.lastName}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Roll {s.rollNumber ?? "-"}</Text>
            </View>
            <View style={styles.statusGroup}>
              {STATUS_OPTIONS.map((opt) => {
                const active = (marks[s.studentId]?.status ?? "present") === opt.value;
                const activeColor = STATUS_ACTIVE_COLOR(opt.value, colors);
                return (
                  <Pressable
                    key={opt.value}
                    disabled={!editable}
                    onPress={() => setStatus(s.studentId, opt.value)}
                    style={[
                      styles.statusButton,
                      { backgroundColor: active ? activeColor.bg : "transparent", borderColor: active ? activeColor.bg : colors.border, opacity: editable ? 1 : 0.5 },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={{ color: active ? activeColor.fg : colors.foreground, fontWeight: "600", fontSize: 13 }}>{opt.short}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {lockedStudents.map((s) => (
          <View key={s.studentId} style={[styles.studentRow, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
            <Text style={{ color: colors.mutedForeground, flex: 1 }}>
              {s.firstName} {s.lastName} (Roll {s.rollNumber ?? "-"})
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Already marked elsewhere</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { borderColor: colors.border }]}>
        {submitError ? <ErrorBanner message={submitError} onRetry={handleSubmit} /> : null}
        {skippedOtherSection.length > 0 ? (
          <Text style={{ color: colors.warningForeground }}>{skippedOtherSection.length} student(s) were already marked in another section today.</Text>
        ) : null}
        {saved ? <Text style={{ color: colors.successForeground }}>Saved.</Text> : null}
        <Button
          label={submitting ? "Submitting..." : `Submit (${markedCount} of ${totalToMark})`}
          onPress={() => void handleSubmit()}
          loading={submitting}
          disabled={!canSubmit}
        />
        <Button label="Back to sections" variant="ghost" onPress={() => router.back()} />
      </View>
    </View>
  );
}

function STATUS_ACTIVE_COLOR(status: AttendanceStatus, colors: ReturnType<typeof useTheme>["colors"]): { bg: string; fg: string } {
  switch (status) {
    case "present":
      return { bg: colors.successSolid, fg: colors.primaryForeground };
    case "absent":
      return { bg: colors.dangerSolid, fg: colors.primaryForeground };
    case "late":
    case "half_day":
      return { bg: colors.warningSolid, fg: colors.primaryForeground };
    case "leave":
      return { bg: colors.infoSolid, fg: colors.primaryForeground };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notice: {
    margin: 12,
    marginBottom: 0,
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderRadius: 4,
  },
  summaryBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    margin: 12,
    marginBottom: 0,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  list: {
    padding: 12,
    gap: 6,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  statusGroup: {
    flexDirection: "row",
    gap: 4,
  },
  statusButton: {
    minWidth: 36,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
  },
  footer: {
    borderTopWidth: 1,
    padding: 12,
    gap: 8,
  },
});
