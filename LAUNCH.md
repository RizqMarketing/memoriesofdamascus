# Launch instructie

Stand van zaken: alle code staat klaar. Wat je nog moet doen om alles écht live te krijgen, in volgorde van afhankelijkheid.

---

## 1. Supabase migrations runnen (5 min)

Plak in volgorde in **Supabase → SQL Editor → New query → Run**:
1. `supabase/schema.sql` — *al gedaan ✓*
2. `supabase/fix-policies.sql` — *al gedaan ✓*
3. `supabase/schema-v2-kalender.sql` — *al gedaan ✓*
4. **`supabase/schema-v3-mollie.sql`** — nog niet gedaan, plak en run nu

---

## 2. Resend account (testen — 10 min)

1. [resend.com](https://resend.com) → sign up (gratis tier, 3000 emails/mnd)
2. **API Keys** → Create → kopieer `re_...` key
3. Voor productie email vanaf eigen domein heb je Anouk's domein-toegang nodig (DNS records). Voor testen: gebruik `onboarding@resend.dev` als FROM_EMAIL.

---

## 3. Mollie keys ophalen (5 min, na Anouks reactie)

Anouk levert via WhatsApp:
- `MOLLIE_API_KEY` (live_-key voor productie)
- Voor testen mag ook `test_-key`

---

## 4. Netlify ENV vars zetten (10 min)

Per Netlify site (MoD nu live, Morgenland + Kookworkshops nog te deployen):

**Site settings → Environment variables → Add a variable:**

| Variable | Waarde | Bron |
|---|---|---|
| `RESEND_API_KEY` | `re_...` | stap 2 |
| `NOTIFY_EMAIL` | Anouk's email | Anouk |
| `FROM_EMAIL` | `Memories of Damascus <onboarding@resend.dev>` | nu test, later eigen domein |
| `MOLLIE_API_KEY` | `live_...` | stap 3 |
| `SUPABASE_URL` | `https://sphnynlfyzialpldrgew.supabase.co` | bekend |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (uit Supabase Settings → API → service_role) | jouw eigen kluis |
| `SITE_URL` | bv. `https://memoriesofdamascus.nl` | per site juist domein |
| `GOOGLE_MAPS_API_KEY` | bestaand | al gezet voor distance |

---

## 5. Code deployen

```bash
git push origin main
```

Netlify auto-deployt MoD. Voor Morgenland en Kookworkshops: nieuwe Netlify sites aanmaken (zie #4 + #5 in TaskList — wacht op Anouks domein-info).

---

## 6. Plausible activeren (optioneel, 5 min)

1. [plausible.io](https://plausible.io) → account ($9/mnd voor 3 sites)
2. Add 3 sites: `memoriesofdamascus.nl`, `morgenland.nu`, `morgenlandkookt.nl`
3. In `index.html`, `morgenland/index.html`, `kookworkshops/index.html`:
   - Zoek de regel `<!-- <script defer data-domain=...`
   - Verwijder de `<!--` en `-->` om te activeren

---

## 7. End-to-end test na deploy

- Submit een form op live site → check email arriveert (klant + Anouk)
- Configurator → Direct afrekenen → check Mollie checkout opent (test mode)
- Mollie test-betaling → terug op site → check `payment_status=paid` in dashboard
- Dashboard → kalender → blokkeer datum → check op live site dat datum rood is

---

## Wat nog open staat (Anouk-input)

Zie `anouk-vragenlijst.md` — domein-toegangen, KvK gegevens al binnen, catalogus PDF, foto's.
