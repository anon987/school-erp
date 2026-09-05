-- Bulk marks entry for one exam_subject in a single round trip -- same shape as
-- fn_mark_section_attendance (attendance migration): one JSONB array in, per-row upsert, but
-- with per-row exception handling so one student's bad input (e.g. a fat-fingered 1000) doesn't
-- discard an entire class's worth of correctly-typed marks. Runs as the calling user (not
-- security definer), so mark_write's RLS check and fn_validate_mark's trigger both still apply
-- per row -- this function is a batching convenience, not a privilege escalation.
create or replace function public.fn_save_marks(
  p_exam_subject_id uuid,
  p_entered_by_auth_user_id uuid,
  p_marks jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_mark jsonb;
  v_student_id uuid;
  v_marks_obtained numeric;
  v_internal_marks_obtained numeric;
  v_is_absent boolean;
  v_remarks text;
  v_written int := 0;
  v_errors jsonb := '[]'::jsonb;
begin
  for v_mark in select * from jsonb_array_elements(p_marks) loop
    v_student_id := (v_mark->>'student_id')::uuid;
    v_is_absent := coalesce((v_mark->>'is_absent')::boolean, false);
    v_marks_obtained := nullif(v_mark->>'marks_obtained', '')::numeric;
    v_internal_marks_obtained := nullif(v_mark->>'internal_marks_obtained', '')::numeric;
    v_remarks := nullif(v_mark->>'remarks', '');

    begin
      insert into public.mark (exam_subject_id, student_id, marks_obtained, internal_marks_obtained, is_absent, remarks, entered_by_auth_user_id)
      values (p_exam_subject_id, v_student_id, v_marks_obtained, v_internal_marks_obtained, v_is_absent, v_remarks, p_entered_by_auth_user_id)
      on conflict (exam_subject_id, student_id) do update
        set marks_obtained = excluded.marks_obtained,
            internal_marks_obtained = excluded.internal_marks_obtained,
            is_absent = excluded.is_absent,
            remarks = excluded.remarks,
            entered_by_auth_user_id = p_entered_by_auth_user_id,
            updated_at = now();
      v_written := v_written + 1;
    exception when others then
      v_errors := v_errors || jsonb_build_object('student_id', v_student_id, 'error', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('written', v_written, 'errors', v_errors);
end;
$$;

grant execute on function public.fn_save_marks(uuid, uuid, jsonb) to authenticated;
