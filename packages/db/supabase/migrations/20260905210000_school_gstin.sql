-- P1 Fees, "GST-ready receipt fields" (docs/schoolerp_features.md §F). Most schools' tuition fees
-- are GST-exempt in India, so this is deliberately just the one field a registered school needs
-- to print on a receipt to make it GST-compliant when it DOES apply (e.g. transport/hostel/canteen
-- charges bundled into the same invoice) -- not a tax-calculation engine, which nothing in the
-- spec or the pilot school's requirements asks for.
alter table public.school
  add column gstin text;

comment on column public.school.gstin is
  'Optional. 15-character GST Identification Number, printed on fee receipts when present. Format
   validated at the application layer (schoolProfileInputSchema) -- left as free text here since
   schools without GST registration leave it blank.';
