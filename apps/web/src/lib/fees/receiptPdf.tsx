import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { formatDateTimeDisplayIst } from "@/lib/core/dateIst";
import { NOTO_SANS_FAMILY, registerPdfFonts } from "@/lib/core/pdf/registerFonts";
import { amountInWords } from "./amountInWords";
import type { ReceiptDetails } from "./queries";
import type { ReceiptTemplateConfig } from "./receiptTemplates";

registerPdfFonts();

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function capitalizeWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function buildStyles(template: ReceiptTemplateConfig) {
  const accent = template.accent ?? "#1f2937";
  const isBoxed = template.style === "boxed";
  const isBand = template.style === "band";

  return StyleSheet.create({
    page: { padding: 32, fontSize: 10, fontFamily: NOTO_SANS_FAMILY, position: "relative" },
    frame: isBoxed ? { borderWidth: 1.5, borderColor: accent, padding: 16, flex: 1 } : { flex: 1 },
    // A5 portrait is ~419.5 x 595.3pt -- fixed pt values center a 220x220 mark on the page
    // (percentage strings position the box's top-left corner, not its center, so they can't
    // center it directly).
    watermark: { position: "absolute", top: 188, left: 100, width: 220, height: 220, opacity: 0.08 },
    header: isBand
      ? { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: accent, padding: 12, marginBottom: 16 }
      : { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: accent, paddingBottom: 12, marginBottom: 16 },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    logo: { width: 36, height: 36, objectFit: "contain" },
    schoolName: { fontSize: 14, fontWeight: 700, color: isBand ? "#ffffff" : "#0f172a" },
    gstin: { fontSize: 8, color: isBand ? "#ffffff" : "#64748b" },
    receiptLabel: { fontSize: 10, color: isBand ? "#ffffff" : "#64748b" },
    grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
    cell: { width: "50%", marginBottom: 8 },
    cellLabel: { fontSize: 8, color: "#64748b", marginBottom: 2, textTransform: "uppercase" },
    cellValue: { fontSize: 11 },
    table: { marginBottom: 12, borderWidth: isBoxed ? 1 : 0, borderColor: accent },
    tableHeaderRow: isBand
      ? { flexDirection: "row", backgroundColor: accent, paddingVertical: 4 }
      : { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: accent, paddingVertical: 4 },
    tableHeaderCell: { fontSize: 8, fontWeight: 700, color: isBand ? "#ffffff" : "#0f172a", textTransform: "uppercase" },
    tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e2e8f0", paddingVertical: 3 },
    tableTotalRow: { flexDirection: "row", borderTopWidth: 1.5, borderTopColor: accent, paddingVertical: 4 },
    colHead: { flex: 2, paddingHorizontal: 4 },
    colNum: { flex: 1, paddingHorizontal: 4, textAlign: "right" },
    // No fontStyle: "italic" -- @react-pdf/renderer needs a separate registered font file per
    // style/weight (it doesn't synthesize italics from the regular font the way a browser does),
    // and only the regular weight is bundled. The HTML view can still italicize this line fine.
    wordsLine: { color: "#475569", marginBottom: 10 },
    amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 10, marginBottom: 10 },
    amountLabel: { fontSize: 11, fontWeight: 700 },
    amountValue: { fontSize: 18, fontWeight: 700 },
    summaryLine: { fontSize: 9, color: "#475569", marginBottom: 2 },
    notice: { marginTop: 10, padding: 8, backgroundColor: "#fef3c7", fontSize: 9, color: "#92400e" },
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

function ReceiptDocument({
  receipt,
  schoolName,
  gstin,
  logoUrl,
  template,
  watermarkEnabled,
}: {
  receipt: ReceiptDetails;
  schoolName: string;
  gstin?: string | null | undefined;
  logoUrl: string | null;
  template: ReceiptTemplateConfig;
  watermarkEnabled: boolean;
}) {
  const s = buildStyles(template);
  const netTotal = receipt.lineItems.reduce((sum, item) => sum + (item.amountPaise - item.concessionAmountPaise), 0);

  return (
    <Document>
      <Page size="A5" style={s.page}>
        {watermarkEnabled && logoUrl ? <Image src={logoUrl} style={s.watermark} /> : null}
        <View style={s.frame}>
          <View style={s.header}>
            <View style={s.headerLeft}>
              {logoUrl ? <Image src={logoUrl} style={s.logo} /> : null}
              <View>
                <Text style={s.schoolName}>{schoolName}</Text>
                {gstin ? <Text style={s.gstin}>GSTIN: {gstin}</Text> : null}
              </View>
            </View>
            <Text style={s.receiptLabel}>Fee Receipt</Text>
          </View>

          <View style={s.grid}>
            <Cell styles={s} label="Receipt No." value={receipt.receiptNumber ?? "—"} />
            <Cell styles={s} label="Date" value={formatDateTimeDisplayIst(receipt.createdAt)} />
            <Cell styles={s} label="Student" value={receipt.studentName} />
            <Cell styles={s} label="Admission No." value={receipt.admissionNumber} />
            <Cell styles={s} label="Class" value={receipt.className ? `${receipt.className} - ${receipt.sectionName}` : "—"} />
            <Cell styles={s} label="Month" value={receipt.installmentLabel} />
            <Cell styles={s} label="Invoice No." value={receipt.invoiceNumber} />
            <Cell styles={s} label="Payment method" value={receipt.method + (receipt.referenceNumber ? ` (${receipt.referenceNumber})` : "")} />
            {receipt.fatherName ? <Cell styles={s} label="Father's Name" value={receipt.fatherName} /> : null}
            {receipt.primaryContactName ? (
              <Cell
                styles={s}
                label="Primary Contact"
                value={
                  receipt.primaryContactRelationship
                    ? `${receipt.primaryContactName} (${capitalizeWord(receipt.primaryContactRelationship)})`
                    : receipt.primaryContactName
                }
              />
            ) : null}
            {receipt.primaryContactPhone ? <Cell styles={s} label="Phone" value={receipt.primaryContactPhone} /> : null}
            {receipt.primaryContactEmail ? <Cell styles={s} label="Email" value={receipt.primaryContactEmail} /> : null}
          </View>

          {receipt.lineItems.length > 0 ? (
            <View style={s.table}>
              <View style={s.tableHeaderRow}>
                <Text style={[s.tableHeaderCell, s.colHead]}>Fee Head</Text>
                <Text style={[s.tableHeaderCell, s.colNum]}>Amount</Text>
                <Text style={[s.tableHeaderCell, s.colNum]}>Discount</Text>
                <Text style={[s.tableHeaderCell, s.colNum]}>Net</Text>
              </View>
              {receipt.lineItems.map((item, i) => (
                <View key={i} style={s.tableRow}>
                  <Text style={s.colHead}>{item.feeHeadName}</Text>
                  <Text style={s.colNum}>{rupees(item.amountPaise)}</Text>
                  <Text style={s.colNum}>{rupees(item.concessionAmountPaise)}</Text>
                  <Text style={s.colNum}>{rupees(item.amountPaise - item.concessionAmountPaise)}</Text>
                </View>
              ))}
              <View style={s.tableTotalRow}>
                <Text style={[s.colHead, { fontWeight: 700 }]}>Total</Text>
                <Text style={[s.colNum, { fontWeight: 700 }]}>{rupees(receipt.lineItems.reduce((sum, i) => sum + i.amountPaise, 0))}</Text>
                <Text style={[s.colNum, { fontWeight: 700 }]}>{rupees(receipt.lineItems.reduce((sum, i) => sum + i.concessionAmountPaise, 0))}</Text>
                <Text style={[s.colNum, { fontWeight: 700 }]}>{rupees(netTotal)}</Text>
              </View>
            </View>
          ) : null}

          <Text style={s.wordsLine}>{amountInWords(receipt.amountPaise)}</Text>

          <View style={s.amountRow}>
            <Text style={s.amountLabel}>Amount received</Text>
            <Text style={s.amountValue}>{rupees(receipt.amountPaise)}</Text>
          </View>

          <Text style={s.summaryLine}>Invoice total: {rupees(receipt.invoiceTotalPaise)}</Text>
          <Text style={s.summaryLine}>Paid to date: {rupees(receipt.invoicePaidToDatePaise)}</Text>
          <Text style={[s.summaryLine, { fontWeight: 700 }]}>
            {receipt.invoiceBalancePaise > 0 ? `Balance due: ${rupees(receipt.invoiceBalancePaise)}` : "Invoice fully paid"}
          </Text>

          {receipt.status === "pending_gateway" ? (
            <Text style={s.notice}>
              This online payment has not been confirmed by the payment gateway yet -- this is not a valid receipt until it shows as captured.
            </Text>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}

export async function renderReceiptPdf(
  receipt: ReceiptDetails,
  schoolName: string,
  logoUrl: string | null,
  template: ReceiptTemplateConfig,
  watermarkEnabled: boolean,
  gstin?: string | null | undefined,
): Promise<Buffer> {
  return renderToBuffer(
    <ReceiptDocument receipt={receipt} schoolName={schoolName} gstin={gstin} logoUrl={logoUrl} template={template} watermarkEnabled={watermarkEnabled} />,
  );
}
