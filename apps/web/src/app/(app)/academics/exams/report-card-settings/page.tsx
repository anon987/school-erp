import { redirect } from "next/navigation";

/**
 * Report Card Settings and Report Card Setups merged into one page (/academics/exams/report-cards)
 * -- two similarly-named separate screens for what most schools experience as one concept was the
 * exact confusion reported. This stub exists so old links/bookmarks to the pre-merge URL still
 * land somewhere, instead of falling through to the sibling [examId] dynamic route and erroring
 * ("report-card-settings" is not a valid exam id).
 */
export default function ReportCardSettingsRedirect() {
  redirect("/academics/exams/report-cards");
}
