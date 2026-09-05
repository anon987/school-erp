-- fn_generate_yearly_invoices excluded a student from future chunks only once they had an
-- invoice. A student with no matching fee_structure for their class/category never gets one, so
-- they were never excluded -- `order by s.id limit p_limit` kept re-selecting the exact same
-- unconfigured students every call, forever. On the pilot school this showed up as "Processed
-- 5000 -- 2000 remaining" after the client's 100-chunk safety cap: 2,000 students stuck with no
-- fee_structure match, endlessly reprocessed, never letting the chunker advance to anyone after
-- them in student-id order.
--
-- Fix: a cursor (p_after_student_id) so every call examines a genuinely new slice of students
-- regardless of outcome -- `done` now means "reached the end of the enrolled list", not "everyone
-- has an invoice". Also reports *why* students were skipped (skipped_no_structure) instead of
-- silently absorbing them into "processed", so Setup can tell the school "here's how many
-- students still need a fee structure" rather than looking like an infinite loop.

drop function if exists public.fn_generate_yearly_invoices(uuid, uuid, int);

create or replace function public.fn_generate_yearly_invoices(
  p_school_id uuid,
  p_academic_year_id uuid,
  p_after_student_id uuid default null,
  p_limit int default 50
)
returns jsonb
language plpgsql
as $$
declare
  v_student record;
  v_structure_id uuid;
  v_installment record;
  v_item record;
  v_concession_pct numeric;
  v_concession_fixed bigint;
  v_line_amount bigint;
  v_concession_amount bigint;
  v_invoice_id uuid;
  v_invoice_total bigint;
  v_invoice_number text;
  v_remaining int;
  v_processed int := 0;
  v_invoiced int := 0;
  v_skipped_no_structure int := 0;
  v_last_student_id uuid := p_after_student_id;
begin
  create temporary table _invoice_lines (fee_head_id uuid, amount_paise bigint, concession_amount_paise bigint) on commit drop;

  for v_student in
    select s.id as student_id, s.category_id, e.class_id
    from public.student s
    join public.enrollment e on e.student_id = s.id and e.academic_year_id = p_academic_year_id
    where s.school_id = p_school_id
      and (p_after_student_id is null or s.id > p_after_student_id)
    order by s.id
    limit p_limit
  loop
    v_processed := v_processed + 1;
    v_last_student_id := v_student.student_id;

    -- Idempotent resume: a student who already has any invoice for this academic year (from an
    -- earlier run) is left alone, not re-invoiced.
    continue when exists (select 1 from public.invoice i where i.student_id = v_student.student_id and i.academic_year_id = p_academic_year_id);

    select fee_structure_id into v_structure_id
    from public.student_fee_assignment
    where student_id = v_student.student_id and academic_year_id = p_academic_year_id;

    if v_structure_id is null then
      select id into v_structure_id from public.fee_structure
      where school_id = p_school_id and academic_year_id = p_academic_year_id
        and class_id = v_student.class_id and category_id = v_student.category_id;
    end if;
    if v_structure_id is null then
      select id into v_structure_id from public.fee_structure
      where school_id = p_school_id and academic_year_id = p_academic_year_id
        and class_id = v_student.class_id and category_id is null;
    end if;

    -- No fee structure configured for this student's class/category: nothing to invoice yet.
    -- Not an error -- Fees setup may still be in progress for some classes -- but the cursor above
    -- still advances past them, so they don't block progress on everyone else.
    if v_structure_id is null then
      v_skipped_no_structure := v_skipped_no_structure + 1;
      continue;
    end if;

    for v_installment in
      select id, sequence_number, due_date from public.installment
      where school_id = p_school_id and academic_year_id = p_academic_year_id
      order by sequence_number
    loop
      v_invoice_total := 0;
      delete from _invoice_lines;

      for v_item in
        select fee_head_id, amount_paise, one_time_installment_number
        from public.fee_structure_item
        where fee_structure_id = v_structure_id
          and (one_time_installment_number is null or one_time_installment_number = v_installment.sequence_number)
      loop
        v_line_amount := v_item.amount_paise;

        select percentage_value, fixed_value_paise into v_concession_pct, v_concession_fixed
        from public.concession_rule
        where school_id = p_school_id and academic_year_id = p_academic_year_id
          and category_id = v_student.category_id
          and (fee_head_id = v_item.fee_head_id or fee_head_id is null)
        order by fee_head_id nulls last
        limit 1;

        if v_concession_pct is not null then
          v_concession_amount := least(v_line_amount, round(v_line_amount * v_concession_pct / 100.0));
        elsif v_concession_fixed is not null then
          v_concession_amount := least(v_line_amount, v_concession_fixed);
        else
          v_concession_amount := 0;
        end if;

        insert into _invoice_lines values (v_item.fee_head_id, v_line_amount, v_concession_amount);
        v_invoice_total := v_invoice_total + (v_line_amount - v_concession_amount);
        v_concession_pct := null;
        v_concession_fixed := null;
      end loop;

      -- An installment with nothing due (e.g. all one-time heads fell in a different month) --
      -- still no invoice: nothing to collect, nothing to show on a dues list.
      if not exists (select 1 from _invoice_lines) then
        continue;
      end if;

      v_invoice_number := public.fn_next_school_number(p_school_id, 'fee_invoice');

      insert into public.invoice (school_id, student_id, academic_year_id, installment_id, invoice_number, due_date, total_amount_paise)
      values (p_school_id, v_student.student_id, p_academic_year_id, v_installment.id, v_invoice_number, v_installment.due_date, v_invoice_total)
      returning id into v_invoice_id;

      insert into public.invoice_line (invoice_id, fee_head_id, amount_paise, concession_amount_paise)
      select v_invoice_id, fee_head_id, amount_paise, concession_amount_paise from _invoice_lines;
    end loop;

    v_invoiced := v_invoiced + 1;
  end loop;

  select count(*) into v_remaining
  from public.student s
  join public.enrollment e on e.student_id = s.id and e.academic_year_id = p_academic_year_id
  where s.school_id = p_school_id
    and (v_last_student_id is null or s.id > v_last_student_id);

  return jsonb_build_object(
    'processed', v_processed,
    'invoiced', v_invoiced,
    'skippedNoStructure', v_skipped_no_structure,
    'remaining', v_remaining,
    'done', v_processed < p_limit,
    'lastStudentId', v_last_student_id
  );
end;
$$;

grant execute on function public.fn_generate_yearly_invoices(uuid, uuid, uuid, int) to authenticated;
