-- ═══════════════════════════════════════════════════════════════
-- Memories of Damascus — Supabase schema V1
-- Plak in: SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. offerteverzoeken ─────────────────────────────────────────
-- Alle aanvragen vanuit alle 3 sites landen hier.
create table if not exists public.offerteverzoeken (
  id uuid primary key default gen_random_uuid(),

  -- herkomst
  site text not null check (site in ('mod', 'morgenland', 'kookworkshops')),
  formulier text not null,                       -- 'contact' | 'configurator' | 'offerte-modal' | 'workshop-aanvraag'

  -- contact
  naam text not null,
  email text not null,
  telefoon text,
  bericht text,

  -- event
  datum date,
  tijdstip text,
  personen integer,
  type_evenement text,

  -- locatie
  adres_straat text,
  adres_postcode text,
  adres_plaats text,

  -- configurator-data (gerechten, addons, reiskosten, totaal — vrij JSON)
  configurator jsonb,

  -- workshop-specifiek
  workshop_type text,                            -- 'team' | 'prive' | 'reeks' | null

  -- finance
  totaal_bedrag numeric(10,2),

  -- intern beheer
  status text not null default 'nieuw' check (status in (
    'nieuw', 'in_behandeling', 'verstuurd', 'bevestigd', 'afgehandeld', 'geannuleerd'
  )),
  notitie_intern text,

  -- tracking
  user_agent text,
  ip_hash text,                                  -- optioneel, alleen via Netlify Function te vullen
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexen voor dashboard queries (lijst per site, sorteren op datum)
create index if not exists offerteverzoeken_site_idx on public.offerteverzoeken (site, status, created_at desc);
create index if not exists offerteverzoeken_created_idx on public.offerteverzoeken (created_at desc);

-- ─── 2. updated_at trigger ───────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists offerteverzoeken_updated_at on public.offerteverzoeken;
create trigger offerteverzoeken_updated_at
  before update on public.offerteverzoeken
  for each row execute function public.set_updated_at();

-- ─── 3. Row Level Security ───────────────────────────────────────
alter table public.offerteverzoeken enable row level security;

-- Anonymous mag INSERTen (forms vanuit alle 3 sites)
drop policy if exists "Anon kan offerte indienen" on public.offerteverzoeken;
create policy "Anon kan offerte indienen"
  on public.offerteverzoeken
  for insert
  to anon
  with check (true);

-- Anouk (authenticated) heeft volledige toegang
drop policy if exists "Authenticated kan alles" on public.offerteverzoeken;
create policy "Authenticated kan alles"
  on public.offerteverzoeken
  for all
  to authenticated
  using (true)
  with check (true);

-- Anonymous mag NIET selecteren/updaten/deleten — alleen INSERT
-- (geen extra policies nodig; RLS default = deny)

-- ═══════════════════════════════════════════════════════════════
-- Klaar. Volgende migrations:
--   V2 — kalender_blokkering (configurator)
--   V3 — open_workshops + workshop_signups (kookworkshops)
--   V4 — baklava_bestellingen
-- ═══════════════════════════════════════════════════════════════
