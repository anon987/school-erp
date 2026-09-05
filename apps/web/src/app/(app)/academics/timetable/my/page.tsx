import { requireSession } from "@/lib/core/auth/requireSession";
import { getCurrentStaffId } from "@/lib/core/auth/currentStaff";
import { getMasterDataOverview } from "@/lib/master-data/queries";
import { getTeacherTimetable } from "@/lib/timetable/queries";
import { DAY_NAMES } from "@/lib/timetable/types";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const WORKING_DAYS = [1, 2, 3, 4, 5, 6];

export default async function MyTimetablePage() {
  const session = await requireSession();
  const staffId = await getCurrentStaffId();

  if (!staffId) {
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumbs items={[{ label: "Timetable", href: "/academics/timetable" }, { label: "My Timetable" }]} />
        <p className="text-sm text-muted-foreground">No staff record is linked to your account, so there is no personal timetable to show.</p>
      </div>
    );
  }

  const [overview, slots] = await Promise.all([getMasterDataOverview(session.schoolId!), getTeacherTimetable(session.schoolId!, staffId)]);
  const slotsByDay = new Map<number, typeof slots>();
  for (const s of slots) {
    slotsByDay.set(s.dayOfWeek, [...(slotsByDay.get(s.dayOfWeek) ?? []), s]);
  }
  const periodsById = new Map(overview.periods.map((p) => [p.id, p]));

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Timetable", href: "/academics/timetable" }, { label: "My Timetable" }]} />
      <h1 className="text-2xl font-semibold">My timetable</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WORKING_DAYS.map((day) => {
          const daySlots = (slotsByDay.get(day) ?? []).slice().sort((a, b) => {
            const pa = periodsById.get(a.periodId)?.periodNumber ?? 0;
            const pb = periodsById.get(b.periodId)?.periodNumber ?? 0;
            return pa - pb;
          });
          return (
            <div key={day} className="rounded-md border border-border bg-card p-4 shadow-sm">
              <h2 className="mb-2 font-semibold">{DAY_NAMES[day]}</h2>
              {daySlots.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {daySlots.map((s) => (
                    <li key={s.id} className="text-sm">
                      <span className="font-figures text-muted-foreground">{periodsById.get(s.periodId)?.label}</span> — {s.subjectName},{" "}
                      {s.className} {s.sectionName}
                      {s.room ? <span className="text-xs text-muted-foreground"> (Room {s.room})</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No periods.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
