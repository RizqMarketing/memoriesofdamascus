-- ═══════════════════════════════════════════════════════════════
-- V4 — Content blokken
-- Anouk kan teksten + bullets per sectie aanpassen via dashboard.
-- Site leest live uit deze tabel met fallback naar hardcoded HTML.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.content_blokken (
  id uuid primary key default gen_random_uuid(),
  site text not null check (site in ('mod','morgenland','kookworkshops')),
  sleutel text not null,                  -- bv. 'diensten.feesten'
  titel text,
  intro text,
  bullets jsonb not null default '[]'::jsonb, -- array van strings (NL)
  updated_at timestamptz not null default now(),
  unique (site, sleutel)
);

create index if not exists content_blokken_site_idx on public.content_blokken (site);

alter table public.content_blokken enable row level security;

drop policy if exists "Content publiek leesbaar" on public.content_blokken;
create policy "Content publiek leesbaar"
  on public.content_blokken
  for select to anon, authenticated
  using (true);

drop policy if exists "Content full voor authenticated" on public.content_blokken;
create policy "Content full voor authenticated"
  on public.content_blokken
  for all to authenticated
  using (true) with check (true);

grant select on public.content_blokken to anon;
grant all on public.content_blokken to authenticated;

-- updated_at automatisch zetten
drop trigger if exists trg_content_blokken_updated on public.content_blokken;
create trigger trg_content_blokken_updated
  before update on public.content_blokken
  for each row execute function public.set_updated_at();

-- ─── Seed: Diensten-sectie van MoD ─────────────────────────────
insert into public.content_blokken (site, sleutel, titel, intro, bullets) values
  ('mod', 'diensten.feesten',
   'Feesten & Bruiloften',
   'Maak uw feest onvergetelijk met authentieke Syrisch-Libanese gerechten. Gratis proeverij bij huwelijkscatering en andere grote feesten — geheel vrijblijvend.',
   '["Voor particulieren en bedrijven","Huwelijkscatering — gratis proeverij","Hapjescatering (mezze/tapas)","Uitgebreide buffetcatering met bediening","Volledig vegetarisch of vegan mogelijk","Dieetwensen: lactosevrij, glutenvrij, notenvrij e.a.","Toetjesbuffetten & losse maaltijden"]'::jsonb),
  ('mod', 'diensten.bedrijven',
   'Bedrijven',
   'Professionele bedrijfscatering in Eindhoven en omgeving. Wij verzorgen alles inclusief op- en afbouw, zodat u zich volledig op uw gasten kunt richten.',
   '["Bedrijfslunches & -diners","Vergaderingen & productlanceringen","Personeelsevents & teambuilding","Vaste dagelijkse cateringcontracten","Inclusieve menuopties (halal, vegan, vegetarisch)","Dieetwensen: lactosevrij, glutenvrij, notenvrij e.a."]'::jsonb),
  ('mod', 'diensten.azc',
   'AZC & Overheidsinstanties',
   'Betrouwbare, complete catering voor AZC''s en crisisnoodopvang. Van ontbijt tot avondeten, inclusief koelingen, buffetten en koffie-/theevoorzieningen.',
   '["Asielzoekerscentra (AZC) — dagelijkse maaltijden","Crisisnoodopvanglocaties","Gemeenten & zorginstellingen","Volledige uitrusting geleverd","Schaalbaar voor honderden personen","Voorkeur voor aanstelling statushouders"]'::jsonb)
on conflict (site, sleutel) do nothing;
