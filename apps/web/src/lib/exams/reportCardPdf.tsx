import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { NOTO_SANS_FAMILY, registerPdfFonts } from "@/lib/core/pdf/registerFonts";
import type { DocumentTemplateConfig } from "@/lib/core/pdf/documentTemplates";
import type { HpcRatingRow, ReportCardData } from "./types";

registerPdfFonts();

function buildStyles(template: DocumentTemplateConfig) {
  const accent = template.accent ?? "#1f2937";
  const isBoxed = template.style === "boxed";
  const isBand = template.style === "band";

  return StyleSheet.create({
    page: { padding: 32, fontSize: 10, fontFamily: NOTO_SANS_FAMILY },
    frame: isBoxed ? { borderWidth: 1.5, borderColor: accent, padding: 16, flex: 1 } : { flex: 1 },
    header: isBand
      ? { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: accent, padding: 12, marginBottom: 14 }
      : { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: accent, paddingBottom: 10, marginBottom: 14 },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    logo: { width: 36, height: 36, objectFit: "contain" },
    schoolName: { fontSize: 14, fontWeight: 700, color: isBand ? "#ffffff" : "#0f172a" },
    label: { fontSize: 10, color: isBand ? "#ffffff" : "#64748b" },
    grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
    cell: { width: "50%", marginBottom: 8 },
    cellLabel: { fontSize: 8, color: "#64748b", marginBottom: 2, textTransform: "uppercase" },
    cellValue: { fontSize: 11 },
    table: { marginBottom: 12, borderWidth: isBoxed ? 1 : 0, borderColor: accent },
    headerRow: isBand
      ? { flexDirection: "row", backgroundColor: accent, paddingVertical: 4 }
      : { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: accent, paddingVertical: 4 },
    headerCell: { fontSize: 8, fontWeight: 700, color: isBand ? "#ffffff" : "#0f172a", textTransform: "uppercase" },
    row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 3 },
    totalRow: { flexDirection: "row", borderTopWidth: 1.5, borderTopColor: accent, paddingVertical: 4 },
    colSubject: { flex: 2, paddingHorizontal: 4 },
    colNum: { flex: 1, paddingHorizontal: 4, textAlign: "right" },
    colGrade: { flex: 1, paddingHorizontal: 4 },
    colRemarks: { flex: 2, paddingHorizontal: 4 },
    summaryRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
    summaryItem: { width: "33%", fontSize: 10, marginBottom: 4 },
    hpcSection: { marginBottom: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
    hpcTitle: { fontSize: 11, fontWeight: 700, color: accent, marginBottom: 6 },
    hpcGroupTitle: { fontSize: 8, color: "#64748b", textTransform: "uppercase", marginBottom: 3 },
    hpcGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
    hpcItem: { width: "50%", flexDirection: "row", justifyContent: "space-between", paddingRight: 8, marginBottom: 3 },
    hpcItemLabel: { fontSize: 9 },
    hpcItemValue: { fontSize: 9, color: "#64748b" },
    footer: { borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 8, fontSize: 9, color: "#64748b" },
  });
}

function Cell({ styles: s, label, value }: { styles: ReturnType<typeof buildStyles>; label: string; value: string }) {
  return (
    <View style={s.cell}>
      <Text style={s.cellLabel}>{label}</Text>
      <Text style={s.cellValue}>{value}</Text>
    </View>
  );
}

function HpcGroup({ s, title, rows }: { s: ReturnType<typeof buildStyles>; title: string; rows: HpcRatingRow[] }) {
  if (rows.length === 0) return null;
  return (
    <View>
      <Text style={s.hpcGroupTitle}>{title}</Text>
      <View style={s.hpcGrid}>
        {rows.map((r) => (
          <View key={r.criterionId} style={s.hpcItem}>
            <Text style={s.hpcItemLabel}>{r.criterionName}</Text>
            <Text style={s.hpcItemValue}>{r.ratingCode ?? "—"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReportCardDocument({
  data,
  schoolName,
  logoUrl,
  template,
}: {
  data: ReportCardData;
  schoolName: string;
  logoUrl: string | null;
  template: DocumentTemplateConfig;
}) {
  const s = buildStyles(template);
  return (
    <Document>
      <Page size="A5" style={s.page}>
        <View style={s.frame}>
          <View style={s.header}>
            <View style={s.headerLeft}>
              {logoUrl ? <Image src={logoUrl} style={s.logo} /> : null}
              <Text style={s.schoolName}>{schoolName}</Text>
            </View>
            <Text style={s.label}>Report Card</Text>
          </View>

          <View style={s.grid}>
            <Cell styles={s} label="Student" value={data.studentName} />
            <Cell styles={s} label="Admission No." value={data.admissionNumber} />
            <Cell styles={s} label="Class" value={data.className ? `${data.className} - ${data.sectionName}` : "—"} />
            <Cell styles={s} label="Father's Name" value={data.fatherName ?? "—"} />
            <Cell styles={s} label="Exam" value={data.examName} />
            <Cell styles={s} label="Academic Year" value={data.academicYearName} />
          </View>

          <View style={s.table}>
            <View style={s.headerRow}>
              <Text style={[s.headerCell, s.colSubject]}>Subject</Text>
              <Text style={[s.headerCell, s.colNum]}>Max</Text>
              <Text style={[s.headerCell, s.colNum]}>Obtained</Text>
              <Text style={[s.headerCell, s.colGrade]}>Grade</Text>
              {data.settings.showRemarks ? <Text style={[s.headerCell, s.colRemarks]}>Remarks</Text> : null}
            </View>
            {data.subjects.map((subject, i) => (
              <View key={i} style={s.row}>
                <Text style={s.colSubject}>{subject.subjectName}</Text>
                <Text style={s.colNum}>{subject.maxMarks}</Text>
                <Text style={s.colNum}>{subject.isAbsent ? "Absent" : (subject.marksObtained ?? 0) + (subject.internalMarksObtained ?? 0)}</Text>
                <Text style={s.colGrade}>{subject.gradeLabel ?? "—"}</Text>
                {data.settings.showRemarks ? <Text style={s.colRemarks}>{subject.remarks ?? "—"}</Text> : null}
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={[s.colSubject, { fontWeight: 700 }]}>Total</Text>
              <Text style={[s.colNum, { fontWeight: 700 }]}>{data.totalMax}</Text>
              <Text style={[s.colNum, { fontWeight: 700 }]}>{data.totalObtained}</Text>
              <Text style={[s.colGrade, { fontWeight: 700 }]}>{data.overallGrade ?? "—"}</Text>
              {data.settings.showRemarks ? <Text style={s.colRemarks} /> : null}
            </View>
          </View>

          <View style={s.summaryRow}>
            <Text style={s.summaryItem}>Percentage: {data.percentage}%</Text>
            {data.settings.showRank && data.rank !== null ? (
              <Text style={s.summaryItem}>
                Rank: {data.rank} of {data.classSize}
              </Text>
            ) : null}
            {data.settings.showAttendance && data.attendancePercent !== null ? <Text style={s.summaryItem}>Attendance: {data.attendancePercent}%</Text> : null}
          </View>

          {data.hpc ? (
            <View style={s.hpcSection}>
              <Text style={s.hpcTitle}>Holistic Progress Card</Text>
              <HpcGroup s={s} title="Co-curricular" rows={data.hpc.coCurricular} />
              <HpcGroup s={s} title="Life Skills" rows={data.hpc.lifeSkills} />
            </View>
          ) : null}

          {data.settings.footerNote ? <Text style={s.footer}>{data.settings.footerNote}</Text> : null}
        </View>
      </Page>
    </Document>
  );
}

export async function renderReportCardPdf(data: ReportCardData, schoolName: string, logoUrl: string | null, template: DocumentTemplateConfig): Promise<Buffer> {
  return renderToBuffer(<ReportCardDocument data={data} schoolName={schoolName} logoUrl={logoUrl} template={template} />);
}
