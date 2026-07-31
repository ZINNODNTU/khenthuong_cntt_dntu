create policy periods_admin_delete
  on public.evaluation_periods
  for delete
  to authenticated
  using (public.current_role() = 'admin');
