create policy "Anon insert"
  on public.offerteverzoeken
  for insert to anon
  with check (true);

create policy "Authenticated full"
  on public.offerteverzoeken
  for all to authenticated
  using (true) with check (true);

notify pgrst, 'reload schema';
