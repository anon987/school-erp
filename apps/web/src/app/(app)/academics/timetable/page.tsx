import Link from "next/link";
import { requireSession } from "@/lib/core/auth/requireSession";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { getMasterDataOverview } from "@/lib/master-data/queries";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { getStaffClassSubjectOptions, getTimetableGrid, getAllStaffOptions, getSubstitutionsForSlots } from "@/lib/timetable/queries";
import { todayIsoIst } from "@/lib/core/dateIst";
import { ClassSectionPicker } from "@/lib/timetable/components/ClassSectionPicker";
import { TimetableGrid } from "@/lib/timetable/components/TimetableGrid";
import { SubstitutionSection } from "@/lib/timetable/components/SubstitutionSection";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function TimetablePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireSession();
  const params = await searchParams;
  const classId = params.classId ?? "";
  const sectionId = params.sectionId ?? "";

  const [overview, academicYearId] = await Promise.all([getMasterDataOverview(session.schoolId!), getCurrentAcademicYearId(session.schoolId!)]);

  return (
    <RequirePermission permission="school.manage_timetable">
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={[{ label: "Timetable" }]} />
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Timetable</h1>
          <Link href="/academics/timetable/my" className="text-sm underline-offset-2 hover:underline">
            My timetable
          </Link>
        </div>

        <ClassSectionPicker classes={overview.classesWithSections} classId={classId} sectionId={sectionId} basePath="/academics/timetable" />

        {classId && sectionId && academicYearId ? (
          <TimetableContent schoolId={session.schoolId!} classId={classId} sectionId={sectionId} academicYearId={academicYearId} periods={overview.periods} />
        ) : (
          <p className="text-sm text-muted-foreground">Select a class and section to view or edit its timetable.</p>
        )}
      </div>
    </RequirePermission>
  );
}

async function TimetableContent({
  schoolId,
  classId,
  sectionId,
  academicYearId,
  periods,
}: {
  schoolId: string;
  classId: string;
  sectionId: string;
  academicYearId: string;
  periods: Awaited<ReturnType<typeof getMasterDataOverview>>["periods"];
}) {
  const [options, slots, staffOptions] = await Promise.all([
    getStaffClassSubjectOptions(schoolId, academicYearId, classId, sectionId),
    getTimetableGrid(schoolId, classId, sectionId),
    getAllStaffOptions(schoolId),
  ]);

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No teacher/subject assignments found for this class and section yet -- assign teachers to subjects first, on each staff member&apos;s
        profile page.
      </p>
    );
  }

  const substitutions = await getSubstitutionsForSlots(
    schoolId,
    slots.map((s) => s.id),
    todayIsoIst(),
  );

  return (
    <div className="flex flex-col gap-6">
      <TimetableGrid classId={classId} sectionId={sectionId} academicYearId={academicYearId} periods={periods} options={options} slots={slots} />
      <SubstitutionSection slots={slots} periods={periods} staffOptions={staffOptions} existingSubstitutions={substitutions} />
    </div>
  );
}
