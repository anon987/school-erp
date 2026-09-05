import { DAY_NAMES, type TimetableSlotRow } from "@/lib/timetable/types";
import type { PeriodRow } from "@/lib/master-data/types";

const WORKING_DAYS = [1, 2, 3, 4, 5, 6];

/**
 * Read-only rendering of a student's weekly timetable -- deliberately NOT the admin/teacher
 * TimetableGrid (that one renders an editable select+input per cell, wired to
 * upsertTimetableSlotAction; RLS would reject a parent's mutation attempt, but shipping an
 * interactive-looking edit UI a viewer can't actually use is a UX bug even though it's not a
 * security one). This is a plain table.
 */
export function PortalTimetableView({ periods, slots }: { periods: PeriodRow[]; slots: TimetableSlotRow[] }) {
  const slotByKey = new Map(slots.map((s) => [`${s.dayOfWeek}:${s.periodId}`, s]));

  if (periods.length === 0) {
    return <p className="text-sm text-muted-foreground">No timetable configured yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
            <th className="px-2 py-2">Period</th>
            {WORKING_DAYS.map((d) => (
              <th key={d} className="px-2 py-2">
                {DAY_NAMES[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0">
              <td className="px-2 py-1.5 align-top text-xs text-muted-foreground">
                {p.label}
                <br />
                <span className="font-figures">
                  {p.startTime}-{p.endTime}
                </span>
              </td>
              {p.isBreak ? (
                <td colSpan={WORKING_DAYS.length} className="bg-secondary/30 px-2 py-1.5 text-center text-xs text-muted-foreground">
                  Break
                </td>
              ) : (
                WORKING_DAYS.map((d) => {
                  const slot = slotByKey.get(`${d}:${p.id}`);
                  return (
                    <td key={d} className="min-w-[8rem] px-2 py-1.5 align-top text-xs">
                      {slot ? (
                        <>
                          <span className="block font-medium text-sm">{slot.subjectName}</span>
                          <span className="text-muted-foreground">{slot.staffName}</span>
                          {slot.room ? <span className="block text-muted-foreground">Room {slot.room}</span> : null}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
