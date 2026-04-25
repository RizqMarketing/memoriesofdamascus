-- ═══════════════════════════════════════════════════════════════
-- V2 — kalender_blokkering
-- Plak in: SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.kalender_blokkering (
  id uuid primary key default gen_random_uuid(),
  site text not null check (site in ('mod', 'morgenland')),
  datum date not null,
  status text not null default 'geblokkeerd' check (status in ('geblokkeerd', 'bijna_vol', 'vol')),
  reden text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site, datum)
);

create index if not exists kalender_blok_site_datum_idx
  on public.kalender_blokkering (site, datum);

drop trigger if exists kalender_blok_updated on public.kalender_blokkering;
create trigger kalender_blok_updated
  before update on public.kalender_blokkering
  for each row execute function public.set_updated_at();

-- RLS
alter table public.kalender_blokkering enable row level security;

-- Grants
grant usage on schema public to anon, authenticated;
grant select on public.kalender_blokkering to anon;
grant all on public.kalender_blokkering to authenticated;

-- Policies
create policy "Anon kan kalender lezen"
  on public.kalender_blokkering
  for select to anon
  using (true);

create policy "Authenticated kalender full"
  on public.kalender_blokkering
  for all to authenticated
  using (true) with check (true);

notify pgrst, 'reload schema';
