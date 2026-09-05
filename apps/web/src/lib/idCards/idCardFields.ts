import { formatDateDisplay } from "@/lib/core/dateIst";
import type { IdCardData, IdCardSettings } from "./types";

export interface IdCardFieldRow {
  label: string;
  value: string;
}

/**
 * Which "Label: Value" rows a card prints, and in what order -- shared by IdCardView.tsx (HTML
 * preview) and idCardPdf.tsx (PDF) so the two renderers can never disagree about which fields a
 * given settings/data combination shows.
 */
export function buildIdCardFieldRows(data: IdCardData, settings: IdCardSettings): IdCardFieldRow[] {
  const rows: IdCardFieldRow[] = [{ label: data.idLabel, value: data.idNumber }];
  if (data.rollNumber) rows.push({ label: "Roll No.", value: data.rollNumber });
  if (settings.showFatherName && data.fatherName) rows.push({ label: "Father", value: data.fatherName });
  if (settings.showMotherName && data.motherName) rows.push({ label: "Mother", value: data.motherName });
  if (settings.showDob && data.dob) rows.push({ label: "D.O.B.", value: formatDateDisplay(data.dob) });
  if (settings.showBloodGroup && data.bloodGroup) rows.push({ label: "Blood Group", value: data.bloodGroup });
  if (settings.showContact && data.contactPhone) rows.push({ label: "Contact", value: data.contactPhone });
  if (settings.showAddress && data.address) rows.push({ label: "Address", value: data.address });
  return rows;
}
