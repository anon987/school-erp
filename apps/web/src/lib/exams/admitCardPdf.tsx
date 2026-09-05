import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { NOTO_SANS_FAMILY, registerPdfFonts } from "@/lib/core/pdf/registerFonts";
import type { DocumentTemplateConfig } from "@/lib/core/pdf/documentTemplates";
import { formatDateDisplay } from "@/lib/core/dateIst";
import type { AdmitCardData } from "./admitCard.types";

registerPdfFonts();

function formatTime(t: string | null): string {
  if (!t) return "—";
  return t.slice(0, 5);
}

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
    body: { flexDirection: "row", gap: 16, marginBottom: 12 },
    grid: { flex: 1, flexDirection: "row", flexWrap: "wrap" },
    cell: { width: "50%", marginBottom: 8 },
    cellLabel: { fontSize: 8, color: "#64748b", marginBottom: 2, textTransform: "uppercase" },
    cellValue: { fontSize: 11 },
    photoBox: { width: 80, height: 100, borderWidth: 1, borderColor: accent, alignItems: "center", justifyContent: "center", backgroundColor: "#f1f5f9" },
    photo: { width: "100%", height: "100%", objectFit: "cover" },
    noPhotoText: { fontSize: 7, color: "#94a3b8" },
    hallTicket: { marginBottom: 12, fontSize: 11, fontWeight: 700 },
    table: { marginBottom: 14, borderWidth: isBoxed ? 1 : 0, borderColor: accent },
    headerRow: isBand
      ? { flexDirection: "row", backgroundColor: accent, paddingVertical: 4 }
      : { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: accent, paddingVertical: 4 },
    headerCell: { fontSize: 8, fontWeight: 700, color: isBand ? "#ffffff" : "#0f172a", textTransform: "uppercase" },
    row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 4 },
    colSubject: { flex: 2, paddingHorizontal: 4 },
    colDate: { flex: 1, paddingHorizontal: 4 },
    colTime: { flex: 1.2, paddingHorizontal: 4 },
    colRoom: { flex: 1, paddingHorizontal: 4 },
    infoRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
    infoItem: { width: "50%", fontSize: 10, marginBottom: 4 },
    instructions: { fontSize: 9, color: "#334155", marginBottom: 16, lineHeight: 1.4 },
    signatureRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 40 },
    signatureBlock: { alignItems: "center", width: "30%" },
    signatureLine: { borderTopWidth: 1, borderTopColor: "#94a3b8", width: "100%", marginBottom: 4 },
    signatureLabel: { fontSize: 8, color: "#64748b" },
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

export async function renderAdmitCardPdf(data: AdmitCardData, schoolName: string, logoUrl: string | null, template: DocumentTemplateConfig): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      <Page size="A4" style={buildStyles(template).page}>
        <AdmitCardPageContent data={data} schoolName={schoolName} logoUrl={logoUrl} template={template} />
      </Page>
    </Document>,
  );
}

/** One PDF, one full page per student -- same "print the batch and cut/staple" convention as ID
 *  cards' and receipts' bulk generation this session. */
export async function renderAdmitCardsBulkPdf(dataList: AdmitCardData[], schoolName: string, logoUrl: string | null, template: DocumentTemplateConfig): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      {dataList.map((data) => (
        <Page key={data.studentId} size="A4" style={buildStyles(template).page}>
          <AdmitCardPageContent data={data} schoolName={schoolName} logoUrl={logoUrl} template={template} />
        </Page>
      ))}
    </Document>,
  );
}

function AdmitCardPageContent({ data, schoolName, logoUrl, template }: { data: AdmitCardData; schoolName: string; logoUrl: string | null; template: DocumentTemplateConfig }) {
  const s = buildStyles(template);
  const { settings } = data;
  return (
    <View style={s.frame}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          {logoUrl ? <Image src={logoUrl} style={s.logo} /> : null}
          <Text style={s.schoolName}>{schoolName}</Text>
        </View>
        <Text style={s.label}>Admit Card — {data.examName}</Text>
      </View>

      <Text style={s.hallTicket}>Hall Ticket No.: {data.hallTicketNumber}</Text>

      <View style={s.body}>
        <View style={s.grid}>
          <Cell styles={s} label="Student" value={data.studentName} />
          <Cell styles={s} label="Admission No." value={data.admissionNumber} />
          <Cell styles={s} label="Roll No." value={data.rollNumber ?? "—"} />
          <Cell styles={s} label="Class" value={data.className ? `${data.className} - ${data.sectionName}` : "—"} />
          <Cell styles={s} label="Academic Year" value={data.academicYearName} />
        </View>
        {settings.showStudentPhoto ? (
          <View style={s.photoBox}>{data.photoUrl ? <Image src={data.photoUrl} style={s.photo} /> : <Text style={s.noPhotoText}>No photo</Text>}</View>
        ) : null}
      </View>

      <View style={s.infoRow}>
        {settings.reportingTime ? <Text style={s.infoItem}>Reporting Time: {settings.reportingTime}</Text> : null}
        {settings.examCentre ? <Text style={s.infoItem}>Exam Centre: {settings.examCentre}</Text> : null}
      </View>

      {data.datesheet.length > 0 ? (
        <View style={s.table}>
          <View style={s.headerRow}>
            <Text style={[s.headerCell, s.colSubject]}>Subject</Text>
            <Text style={[s.headerCell, s.colDate]}>Date</Text>
            <Text style={[s.headerCell, s.colTime]}>Time</Text>
            <Text style={[s.headerCell, s.colRoom]}>Room</Text>
          </View>
          {data.datesheet.map((row, i) => (
            <View key={i} style={s.row}>
              <Text style={s.colSubject}>{row.subjectName}</Text>
              <Text style={s.colDate}>{row.examDate ? formatDateDisplay(row.examDate) : "—"}</Text>
              <Text style={s.colTime}>{row.startTime ? `${formatTime(row.startTime)} - ${formatTime(row.endTime)}` : "—"}</Text>
              <Text style={s.colRoom}>{row.roomNo ?? "—"}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {settings.instructions ? <Text style={s.instructions}>{settings.instructions}</Text> : null}

      {settings.showSignatureLines ? (
        <View style={s.signatureRow}>
          <View style={s.signatureBlock}>
            <View style={s.signatureLine} />
            <Text style={s.signatureLabel}>Student Signature</Text>
          </View>
          <View style={s.signatureBlock}>
            <View style={s.signatureLine} />
            <Text style={s.signatureLabel}>{settings.controllerOfExams ?? "Controller of Exams"}</Text>
          </View>
          <View style={s.signatureBlock}>
            <View style={s.signatureLine} />
            <Text style={s.signatureLabel}>{settings.principalName ?? "Principal"}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
