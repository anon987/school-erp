import Link from "next/link";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { requireSession } from "@/lib/core/auth/requireSession";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { browseStudentsForCollection, getClassOptions, getSectionOptions } from "@/lib/fees/queries";
import { CollectFilterBar } from "@/lib/fees/components/CollectFilterBar";
import { StudentFeesPanel } from "@/lib/fees/components/StudentFeesPanel";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function FeesCollectPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireSession();
  const params = await searchParams;

  return (
    <RequirePermission permission="school.manage_fees">
      <CollectBody
        schoolId={session.schoolId!}
        query={params.q ?? ""}
        classId={params.classId ?? ""}
        sectionId={params.sectionId ?? ""}
        studentId={params.studentId}
      />
    </RequirePermission>
  );
}

async function CollectBody({
  schoolId,
  query,
  classId,
  sectionId,
  studentId,
}: {
  schoolId: string;
  query: string;
  classId: string;
  sectionId: string;
  studentId: string | undefined;
}) {
  const [academicYearId, classes, sections] = await Promise.all([
    getCurrentAcademicYearId(schoolId),
    getClassOptions(schoolId),
    getSectionOptions(schoolId),
  ]);
  const hasFilter = Boolean(query || classId || sectionId);

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: "Fees", href: "/finance/fees" }, { label: "Collect" }]} />
      <h1 className="text-2xl font-semibold">Collect Fees</h1>

      <CollectFilterBar classes={classes} sections={sections} params={{ q: query, classId, sectionId }}>
        {!studentId && hasFilter && academicYearId ? (
          <SearchResults schoolId={schoolId} academicYearId={academicYearId} query={query} classId={classId} sectionId={sectionId} />
        ) : null}
      </CollectFilterBar>
      {studentId ? <StudentInvoices schoolId={schoolId} studentId={studentId} /> : null}
    </div>
  );
}

async function SearchResults({
  schoolId,
  academicYearId,
  query,
  classId,
  sectionId,
}: {
  schoolId: string;
  academicYearId: string;
  query: string;
  classId: string;
  sectionId: string;
}) {
  const results = await browseStudentsForCollection(schoolId, academicYearId, { query, classId, sectionId });

  if (results.length === 0) {
    return <p className="text-sm text-muted-foreground">No students match this filter.</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-md border border-border bg-card shadow-sm">
      {results.map((s) => (
        <li key={s.studentId}>
          <Link
            href={`/finance/fees/collect?studentId=${s.studentId}`}
            className="flex items-center justify-between px-3 py-2 text-sm hover:bg-secondary"
          >
            <span>
              {s.firstName} {s.lastName} <span className="font-figures text-muted-foreground">({s.admissionNumber})</span>
            </span>
            <span className="text-muted-foreground">
              {s.className} - {s.sectionName}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function StudentInvoices({ schoolId, studentId }: { schoolId: string; studentId: string }) {
  return <StudentFeesPanel schoolId={schoolId} studentId={studentId} canManage />;
}
