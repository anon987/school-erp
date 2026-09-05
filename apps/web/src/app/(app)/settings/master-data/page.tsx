import { requireSession } from "@/lib/core/auth/requireSession";
import { RequirePermission } from "@/lib/core/auth/RequirePermission";
import { getMasterDataOverview } from "@/lib/master-data/queries";
import { getCustomFieldDefinitions } from "@/lib/core/customFields/queries";
import { CustomFieldDefinitionsSection } from "@/lib/core/customFields/components/CustomFieldDefinitionsSection";
import { getIdCardSettings } from "@/lib/idCards/queries";
import { getSchoolBranding } from "@/lib/core/school/getSchoolBranding";
import {
  createDepartmentAction,
  createDesignationAction,
  createHouseAction,
  updateDepartmentAction,
  updateDesignationAction,
  updateHouseAction,
  deleteDepartmentAction,
  deleteDesignationAction,
  deleteHouseAction,
} from "@/lib/master-data/actions";
import { AcademicYearSection } from "@/lib/master-data/components/AcademicYearSection";
import { ClassesSection } from "@/lib/master-data/components/ClassesSection";
import { SectionsSection } from "@/lib/master-data/components/SectionsSection";
import { SubjectsSection } from "@/lib/master-data/components/SubjectsSection";
import { ClassSubjectMatrix } from "@/lib/master-data/components/ClassSubjectMatrix";
import { NamedListSection } from "@/lib/master-data/components/NamedListSection";
import { StudentCategoriesSection } from "@/lib/master-data/components/StudentCategoriesSection";
import { HolidaysSection } from "@/lib/master-data/components/HolidaysSection";
import { GradeBandsSection } from "@/lib/master-data/components/GradeBandsSection";
import { AdmissionSettingsSection } from "@/lib/master-data/components/AdmissionSettingsSection";
import { PeriodsSection } from "@/lib/master-data/components/PeriodsSection";
import { HpcSettingsSection } from "@/lib/master-data/components/HpcSettingsSection";
import { IdCardSettingsSection } from "@/lib/idCards/components/IdCardSettingsSection";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function MasterDataPage() {
  const session = await requireSession();
  const [overview, idCardSettings, branding, studentCustomFields, staffCustomFields] = await Promise.all([
    getMasterDataOverview(session.schoolId!),
    getIdCardSettings(session.schoolId!),
    getSchoolBranding(session.schoolId!),
    getCustomFieldDefinitions(session.schoolId!, "student"),
    getCustomFieldDefinitions(session.schoolId!, "staff"),
  ]);

  return (
    <RequirePermission permission="school.manage_master_data">
      <div className="flex flex-col gap-6">
        <Breadcrumbs items={[{ label: "Settings" }, { label: "Master Data" }]} />

        <div>
          <h1 className="text-2xl font-semibold">School Setup &amp; Master Data</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set this up once, in order. The first three sections are required before students and staff can be entered; everything after that
            can be filled in later.
          </p>
        </div>

        <AcademicYearSection years={overview.academicYears} />
        <ClassesSection classes={overview.classesWithSections} />
        <SectionsSection classes={overview.classesWithSections} />

        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">Optional -- can be filled in later</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <SubjectsSection subjects={overview.subjects} />
        <ClassSubjectMatrix classes={overview.classesWithSections} subjects={overview.subjects} pairs={overview.classSubjectPairs} />
        <NamedListSection
          title="Departments"
          rows={overview.departments}
          createAction={createDepartmentAction}
          updateAction={updateDepartmentAction}
          deleteAction={deleteDepartmentAction}
          placeholder="e.g. Science"
        />
        <NamedListSection
          title="Designations"
          rows={overview.designations}
          createAction={createDesignationAction}
          updateAction={updateDesignationAction}
          deleteAction={deleteDesignationAction}
          placeholder="e.g. TGT"
        />
        <StudentCategoriesSection categories={overview.studentCategories} />
        <NamedListSection
          title="Houses"
          rows={overview.houses}
          createAction={createHouseAction}
          updateAction={updateHouseAction}
          deleteAction={deleteHouseAction}
          placeholder="e.g. Ashoka"
        />
        <HolidaysSection holidays={overview.holidays} />
        <GradeBandsSection bands={overview.gradeBands} />
        <AdmissionSettingsSection stages={overview.admissionStages} documentTypes={overview.admissionDocumentTypes} />
        <PeriodsSection periods={overview.periods} />
        <HpcSettingsSection criteria={overview.hpcCriteria} ratingScales={overview.hpcRatingScales} />
        <CustomFieldDefinitionsSection entityType="student" title="Student Custom Fields" definitions={studentCustomFields} />
        <CustomFieldDefinitionsSection entityType="staff" title="Staff Custom Fields" definitions={staffCustomFields} />
        <IdCardSettingsSection settings={idCardSettings} schoolName={branding?.displayName ?? "School"} logoUrl={branding?.logoUrl ?? null} />
      </div>
    </RequirePermission>
  );
}
