-- Fix: anon role had geen INSERT-privilege op de tabel
grant usage on schema public to anon, authenticated;
grant insert on public.offerteverzoeken to anon;
grant all on public.offerteverzoeken to authenticated;

-- Policies opnieuw zetten (idempotent)
drop policy if exists "Anon kan offerte indienen" on public.offerteverzoeken;
drop policy if exists "Authenticated kan alles" on public.offerteverzoeken;

create policy "Anon insert"
  on public.offerteverzoeken
  for insert to anon
  with check (true);

create policy "Authenticated full"
  on public.offerteverzoeken
  for all to authenticated
  using (true) with check (true);
