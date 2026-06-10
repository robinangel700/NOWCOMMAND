# NOWREALM — Creator Deliverable Checklist

> This is the canonical "what Robin uploads and decides from the portal" list.
> Every item below is mapped to a real screen and a real backend route, so you
> can complete the entire checklist end-to-end from `/admin` without touching
> code or env files.

---

## 0. First-day prerequisites (one-time)

| # | Item | Where in portal | Backend route |
|---|------|------------------|----------------|
| 0.1 | Sign in as Robin | `/login` | `POST /api/auth/login` |
| 0.2 | Open the Creator Control Room | `/admin` | n/a |
| 0.3 | Confirm Stripe is in **LIVE** mode (or stay test) | edit `/app/backend/.env` → `STRIPE_API_KEY=sk_live_...` then `sudo supervisorctl restart backend` | n/a |
| 0.4 | Add a Resend API key for real email delivery | edit `/app/backend/.env` → `RESEND_API_KEY=re_...` then `sudo supervisorctl restart backend`. Until then every email is queued in **Admin → Email Log**. | n/a |

---

## 1. Content uploads (do these BEFORE pressing LAUNCH)

| # | What to do | Admin screen | What members will see |
|---|------------|---------------|------------------------|
| 1.1 | Replace the placeholder **Mammon Breaker Activation Codes** PDF | Admin → **Launch → Regenerate Activation Codes PDF** (after dropping a new file into `/app/backend/static/downloads/mammon_breaker_activation_codes.pdf`) | Instant download on `/checkout/success` and `/dashboard` |
| 1.2 | Write the **One-Page Manifesto** | Admin → **Community → Manifesto** | Pinned at the top of `/community` and `/about` |
| 1.3 | Write the **House Rules** | Admin → **Community → House Rules** | Sidebar of `/community` |
| 1.4 | Create your first 4 **Wednesday Drops** (scheduled into the future) | Admin → **Drops → New** (set `scheduled_for` to the upcoming Wednesdays) | Members see them as "Coming next" in `/dashboard` and full content at `/drops/:id` when published |
| 1.5 | Mark which drops are **Foundational** | Same form, check "Foundational" | Foundational ($11) tier sees only these |
| 1.6 | Add at least **one Quick Win** asset under 15 min | Drop form, check "Quick Win" | Highlighted "This month's Quick Wins" on `/dashboard` |
| 1.7 | Create your first **A-la-carte** drop with a price | Drop form, set `alacarte_price_cents` (e.g. `2700` = $27) | Surfaces in `/dashboard` sidebar; members can pay one-time to unlock |
| 1.8 | (Optional) Add a **Quiz** to a drop | API: `POST /api/admin/quizzes` (UI hook to add visually in next phase) | Shows under the drop's body on `/drops/:id` |
| 1.9 | Write the first **Monthly Executive Summary** (3 matters / 3 ignore / 1 resource) | Admin → **Summary** | Emailed instantly to all members when you press "Send" |

---

## 2. Sales rhythm (every day, after launch)

| # | What to do | Admin screen |
|---|------------|---------------|
| 2.1 | Post **2× sales angles** in your free Facebook group and on socials | After each post, tap **Admin → Reminders → Log a sales post**. Target: 2/2 daily. |
| 2.2 | Post **2× free nurture posts** into the funnel group | Tap **Admin → Reminders → Log a nurture post**. Target: 2/2 daily. |
| 2.3 | Drive new traffic to the free FB group in a leveraged way (collab, repost, etc.) | Reminder built in. Add custom reminders under **Admin → Reminders** with date/time. |

---

## 3. Launch button (one tap)

| # | What to do | Admin screen |
|---|------------|---------------|
| 3.1 | Finish §1 fully | Admin → **Checklist** (all items checked = green light) |
| 3.2 | Press **LAUNCH** | Admin → **Launch → Press LAUNCH**. This: (a) starts the 21-day $44 promo window, (b) auto-switches public pricing to $77/mo after 21 days, (c) timestamps `launch_date` so the countdown on `/` and `/pricing` becomes live. |

---

## 4. Ongoing operations (weekly)

| # | What to do | Admin screen |
|---|------------|---------------|
| 4.1 | Drop every Wednesday (just schedule them ahead) | Drops auto-publish at `scheduled_for` time + notify all eligible members by email |
| 4.2 | Approve / moderate community | Admin can **pin** or **delete** any post or comment from `/community` |
| 4.3 | Send the **Monthly Executive Summary** | Admin → **Summary → Send to all members** |
| 4.4 | Drop a monthly **A-la-carte** asset | Drop form, set `alacarte_price_cents` |
| 4.5 | Use the **KingdomTitleDeed.com upsell** in monthly emails | Edit copy: Admin → **Settings → Upsell** (via API `POST /api/admin/settings { key:"kingdom_upsell", value:{...} }`). Members never see this on the sales page — only inside the membership. |

---

## 5. Automated for you (no action required)

| Automation | When it fires | Where |
|-------------|---------------|--------|
| Wednesday drop publishing | Every minute the scheduler checks for due drops | `services/scheduler.py::_publish_due_drops` |
| Win-back email to 14-day-inactive members | Daily sweep — one email per inactive member per 7 days | `services/scheduler.py::_winback_inactive` |
| Weekly Biggest Win community thread | Once per ISO-week, auto-posted by Robin's admin account | `services/scheduler.py::_ensure_weekly_win_thread` |
| Stripe payment-failed notification | Webhook event `invoice.payment_failed` → email with 1-click update card | `server.py::stripe_webhook` |
| Pre-renewal / card-expiration heads-up | Webhook event `invoice.upcoming` | same |
| Founder $44 → $77 price switch | Automatic at `launch_date + 21 days` | `server.py::_current_full_price_cents` |
| 300-member cap → doors close + waitlist | `/api/public/state` recomputes `doors_open` every page load; new signups blocked | `server.py::checkout_subscription` |

---

## 6. When you hit 300 members

| # | What happens | What you do |
|---|---------------|--------------|
| 6.1 | Doors auto-close on `/pricing` | Landing page invites people to the **waitlist** |
| 6.2 | Waitlist is captured | Admin → **Waitlist** (via `GET /api/admin/waitlist`) |
| 6.3 | Raise prices | Edit `/app/backend/.env` → `PRICE_FULL_MONTHLY_CENTS=9700` (or whatever) → `sudo supervisorctl restart backend` |
| 6.4 | Make the offer more solid | Add new Drops, refresh the manifesto, drop a high-ticket a-la-carte |

---

## Quick test credentials

- **Admin:** robinangel700@gmail.com / BoopLoop777
- **Stripe:** currently in dev-mode (sk_test_emergent) — see `/app/memory/test_credentials.md`
- **Email:** queued in DB (`emails_outbox`) until Resend key is added — see Admin → Email Log
