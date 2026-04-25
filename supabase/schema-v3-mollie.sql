-- ═══════════════════════════════════════════════════════════════
-- V3 — Mollie payment kolommen op offerteverzoeken
-- Plak in: SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════

alter table public.offerteverzoeken
  add column if not exists mollie_payment_id text,
  add column if not exists payment_status text check (payment_status in
    ('pending', 'open', 'paid', 'failed', 'expired', 'canceled', 'refunded')),
  add column if not exists payment_url text,
  add column if not exists paid_at timestamptz;

create index if not exists offerteverzoeken_mollie_id_idx
  on public.offerteverzoeken (mollie_payment_id);

create index if not exists offerteverzoeken_payment_status_idx
  on public.offerteverzoeken (payment_status);

notify pgrst, 'reload schema';
