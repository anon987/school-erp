-- "Which classes sit this exam?" scoping (docs/schoolerp_features.md §G, "Exam and term setup" --
-- a refinement of the already-P1 exam setup feature, not a new phase-gated area). No rows for an
-- exam means it applies to every class in the school (the default); rows present mean it applies
-- only to those classes. Controls which classes appear in the "Add Exam Subject" class dropdown --
-- Admit Cards' class dropdown stays keyed off which classes actually have configured subjects
-- (a different, already-correct question: "what data exists to print", not "what was declared in
-- scope").
create table public.exam_class (
  exam_id uuid not null references public.exam(id) on delete cascade,
  class_id uuid not null references public.class(id) on delete cascade,
  primary key (exam_id, class_id)
);

alter table public.exam_class enable row level security;

grant select, insert, update, delete on public.exam_class to authenticated;

-- Same shape as exam_subject's RLS: no school_id of its own, traversed through exam.
create policy exam_class_select on public.exam_class for select to authenticated
  using (exists (select 1 from public.exam e where e.id = exam_class.exam_id and (e.school_id = public.current_school_id() or public.is_super_admin())));
create policy exam_class_write on public.exam_class for all to authenticated
  using (exists (select 1 from public.exam e where e.id = exam_class.exam_id and e.school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin())
  with check (exists (select 1 from public.exam e where e.id = exam_class.exam_id and e.school_id = public.current_school_id() and public.fn_has_permission(public.current_roles(), 'school.manage_exams')) or public.is_super_admin());
