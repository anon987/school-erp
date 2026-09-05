import { redirect } from "next/navigation";

/**
 * Report Card Settings and Report Card Setups merged into one page (/academics/exams/report-cards)
 * -- see the sibling report-card-settings/page.tsx redirect for why. This one matters
 * structurally, not just for old links: without a page.tsx at this exact path, Next.js falls
 * through to the sibling [examId] dynamic route (this directory's [setupId] child doesn't help --
 * that only matches WITH a further segment) and tries to treat "report-card-setups" itself as an
 * exam id, which errors. The [setupId] sub-routes (generate a combined report card) are untouched.
 */
export default function ReportCardSetupsRedirect() {
  redirect("/academics/exams/report-cards");
}
