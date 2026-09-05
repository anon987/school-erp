import { notFound } from "next/navigation";
import { requireSession } from "@/lib/core/auth/requireSession";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { getMasterDataOverview } from "@/lib/master-data/queries";
import { getCurrentAcademicYearId } from "@/lib/core/school/getCurrentAcademicYear";
import { createSupabaseServerClient } from "@/lib/core/supabase/server";
import { NewApplicationForm } from "@/lib/admissions/components/NewApplicationForm";
import { Breadcrumbs } from "@/components/Breadcrumbs";

async function getEnquiryPrefill(schoolId: string, enquiryId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("enquiry")
    .select("first_name, last_name, class_interested_id, phone, email")
    .eq("id", enquiryId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as { first_name: string; last_name: string | null; class_interested_id: string | null; phone: string | null; email: string | null };
  return { firstName: row.first_name, lastName: row.last_name ?? "", classId: row.class_interested_id, phone: row.phone, email: row.email };
}

export default async function NewApplicationPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireSession();
  const params = await searchParams;
  const enquiryId = params.enquiryId;

  const [overview, academicYearId, prefill] = await Promise.all([
    getMasterDataOverview(session.schoolId!),
    getCurrentAcademicYearId(session.schoolId!),
    enquiryId ? getEnquiryPrefill(session.schoolId!, enquiryId) : Promise.resolve(null),
  ]);

  if (!academicYearId) notFound();

  return (
    <RequirePermission permission="school.manage_admissions">
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={[{ label: "Admissions", href: "/people/admissions" }, { label: "New application" }]} />
        <h1 className="text-2xl font-semibold">New application</h1>
        <NewApplicationForm
          classes={overview.classesWithSections.map((c) => ({ id: c.id, name: c.name }))}
          categories={overview.studentCategories}
          academicYearId={academicYearId}
          {...(enquiryId ? { enquiryId } : {})}
          {...(prefill ? { prefill } : {})}
        />
      </div>
    </RequirePermission>
  );
}
