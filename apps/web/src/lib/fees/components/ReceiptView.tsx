import type { ReactNode } from "react";
import { amountInWords } from "../amountInWords";
import type { ReceiptDetails } from "../queries";
import type { ReceiptTemplateConfig } from "../receiptTemplates";
import { formatDateTimeDisplayIst } from "@/lib/core/dateIst";

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function capitalizeWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * The actual receipt content, parameterized by template + watermark so this is the ONE place
 * that renders a receipt -- the real receipt page, and Setup's preview gallery, both use this
 * component (with sample data for the gallery) so a preview can never show something different
 * from what printing/downloading actually produces.
 */
export function ReceiptView({
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
  const accent = template.accent;
  const isBoxed = template.style === "boxed";
  const isBand = template.style === "band";
  const borderColor = accent ?? "#1f2937";
  const netTotal = receipt.lineItems.reduce((sum, item) => sum + (item.amountPaise - item.concessionAmountPaise), 0);

  return (
    <div
      className="relative flex flex-col gap-4 overflow-hidden bg-white p-6 text-[#0f172a]"
      style={isBoxed ? { border: `2px solid ${borderColor}` } : undefined}
    >
      {watermarkEnabled && logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.08]"
        />
      ) : null}

      <div className="relative flex flex-col gap-4">
        <div
          className="flex items-center justify-between gap-3 pb-3"
          style={
            isBand
              ? { backgroundColor: accent ?? undefined, color: "#ffffff", margin: "-1.5rem -1.5rem 0", padding: "1.25rem 1.5rem" }
              : { borderBottom: `1px solid ${isBoxed ? borderColor : "#cbd5e1"}` }
          }
        >
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-12 w-12 object-contain" />
            ) : null}
            <div className="flex flex-col">
              <span className="text-lg font-semibold">{schoolName}</span>
              {gstin ? <span className={`text-xs ${isBand ? "" : "text-[#64748b]"}`}>GSTIN: {gstin}</span> : null}
            </div>
          </div>
          <span className={isBand ? "text-sm" : "text-sm text-[#64748b]"}>Fee Receipt</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Receipt No." value={receipt.receiptNumber ?? "—"} mono />
          <Field label="Date" value={formatDateTimeDisplayIst(receipt.createdAt)} mono />
          <Field label="Student" value={receipt.studentName} />
          <Field label="Admission No." value={receipt.admissionNumber} mono />
          <Field label="Class" value={receipt.className ? `${receipt.className} - ${receipt.sectionName}` : "—"} />
          <Field label="Month" value={receipt.installmentLabel} />
          <Field label="Invoice No." value={receipt.invoiceNumber} mono />
          <Field label="Payment method" value={receipt.method + (receipt.referenceNumber ? ` (${receipt.referenceNumber})` : "")} capitalize />
          {receipt.fatherName ? <Field label="Father's Name" value={receipt.fatherName} /> : null}
          {receipt.primaryContactName ? (
            <Field
              label="Primary Contact"
              value={receipt.primaryContactRelationship ? `${receipt.primaryContactName} (${capitalizeWord(receipt.primaryContactRelationship)})` : receipt.primaryContactName}
            />
          ) : null}
          {receipt.primaryContactPhone ? <Field label="Phone" value={receipt.primaryContactPhone} mono /> : null}
          {receipt.primaryContactEmail ? <Field label="Email" value={receipt.primaryContactEmail} /> : null}
        </div>

        {receipt.lineItems.length > 0 ? (
          <table className="w-full text-sm" style={isBoxed ? { border: `1px solid ${borderColor}` } : undefined}>
            <thead>
              <tr style={isBand ? { backgroundColor: accent ?? undefined, color: "#ffffff" } : { borderBottom: `1px solid ${borderColor}` }}>
                <Th align="left">Fee Head</Th>
                <Th align="right">Amount</Th>
                <Th align="right">Discount</Th>
                <Th align="right">Net</Th>
              </tr>
            </thead>
            <tbody>
              {receipt.lineItems.map((item, i) => (
                <tr key={i} style={isBoxed ? { borderBottom: `1px solid ${borderColor}` } : { borderBottom: "1px solid #e2e8f0" }}>
                  <Td>{item.feeHeadName}</Td>
                  <Td align="right" mono>
                    {rupees(item.amountPaise)}
                  </Td>
                  <Td align="right" mono>
                    {rupees(item.concessionAmountPaise)}
                  </Td>
                  <Td align="right" mono>
                    {rupees(item.amountPaise - item.concessionAmountPaise)}
                  </Td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, borderTop: `2px solid ${borderColor}` }}>
                <Td>Total</Td>
                <Td align="right" mono>
                  {rupees(receipt.lineItems.reduce((s, i) => s + i.amountPaise, 0))}
                </Td>
                <Td align="right" mono>
                  {rupees(receipt.lineItems.reduce((s, i) => s + i.concessionAmountPaise, 0))}
                </Td>
                <Td align="right" mono>
                  {rupees(netTotal)}
                </Td>
              </tr>
            </tbody>
          </table>
        ) : null}

        <div className="flex flex-col gap-1 border-t pt-3 text-sm" style={{ borderColor: "#e2e8f0" }}>
          <p className="italic text-[#475569]">{amountInWords(receipt.amountPaise)}</p>
        </div>

        <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: "#e2e8f0" }}>
          <span className="text-sm font-medium">Amount received</span>
          <span className="font-figures text-2xl font-semibold">{rupees(receipt.amountPaise)}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-[#475569]">
          <span>Invoice total: {rupees(receipt.invoiceTotalPaise)}</span>
          <span>Paid to date: {rupees(receipt.invoicePaidToDatePaise)}</span>
          <span className="col-span-2 font-medium">
            {receipt.invoiceBalancePaise > 0 ? `Balance due: ${rupees(receipt.invoiceBalancePaise)}` : "Invoice fully paid"}
          </span>
        </div>

        {receipt.status === "pending_gateway" ? (
          <p className="rounded-md bg-[#fef3c7] px-3 py-2 text-sm text-[#92400e]">
            This online payment has not been confirmed by the payment gateway yet -- this is not a valid receipt until it shows as captured.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value, mono, capitalize }: { label: string; value: string; mono?: boolean; capitalize?: boolean }) {
  return (
    <div>
      <span className="text-xs font-medium text-[#64748b]">{label}</span>
      <p className={`${mono ? "font-figures" : ""} ${capitalize ? "capitalize" : ""}`}>{value}</p>
    </div>
  );
}

function Th({ children, align }: { children: ReactNode; align: "left" | "right" }) {
  return (
    <th className={`px-2 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>
  );
}

function Td({ children, align, mono }: { children: ReactNode; align?: "left" | "right"; mono?: boolean }) {
  return <td className={`px-2 py-1.5 ${align === "right" ? "text-right" : "text-left"} ${mono ? "font-figures" : ""}`}>{children}</td>;
}
