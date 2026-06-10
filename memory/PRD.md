# NOWREALM — Product Requirements (PRD)

## Original problem statement
$44/mo or $500/yr auto-renew Stripe membership (goal 300 members), Wednesday drops scheduled, admin-only backend portal for Robin Angel, focus themes "Cast out Mammon / Rule the Increase / Cast out Chronos / Operate in Kairos / Get codes from Robin Angel / Begin your own rule over money." Native deep community, saved progress, personalized dashboards, all data disappears on cancel, status/peer recognition, weekly win thread, manifesto, quizzes, notes, bookmarks, days-since-last-login + 14-day winback email, card-expiry reminders, Stripe smart-retry, pause-instead-of-cancel, $11 foundational downgrade, visual loss list on final cancel, monthly quick-win assets under 15 min, monthly 3-bullet executive summary, upcoming-drops preview, 1-page manifesto, weekly biggest-win thread, community rules + moderation, instant Mammon Breaker PDF on purchase, deliverable checklist, $44 → $77 after 3 weeks of launch (creator-pressed launch button), frictionless 1-click signup + email + dashboard, 2x daily sales / 2x daily nurture reminders for creator, KingdomTitleDeed.com upsell IN-membership, 50% affiliate sharing, monthly a-la-carte drops, 300-member cap → waitlist + close doors.

## Personas
1. **Robin Angel (admin/creator)** — single-tenant. Drops content, moderates, presses launch, schedules everything from one portal.
2. **Sovereign member ($44/mo or $500/yr)** — full access to drops, community, quick wins, summaries, a-la-carte, affiliate.
3. **Foundational member ($11/mo downgrade tier)** — foundational drops + quizzes/notes only. No community.
4. **Waitlist seeker** — joins when doors are closed at 300.

## Architecture
- **Backend**: FastAPI on :8001, MongoDB (motor), JWT+bcrypt auth, Stripe SDK direct (subscriptions), Resend SDK (email), reportlab (PDF), apscheduler-style asyncio loop for cron-like tasks.
- **Frontend**: React + react-router + shadcn/ui + sonner toasts + tailwind, custom "sovereign luxury" dark aesthetic (Cormorant Garamond + Outfit + JetBrains Mono).
- **Integration**: Stripe in DEV MODE under `sk_test_emergent` (simulated checkout). Resend optional (emails queue to mongo when no key).

## Implemented (Feb 2026)
- Auth: signup, login, JWT, admin seed (`robinangel700@gmail.com`/`BoopLoop777`), password min-length 8
- Public landing + pricing + manifesto + waitlist + countdown
- Stripe subscriptions (full_monthly, full_annual, foundational_monthly) + a-la-carte one-time + dev-mode simulator
- Onboarding email with Mammon Breaker PDF on successful payment
- Member dashboard: stats, latest drops, upcoming preview, quick wins sidebar, KingdomTitleDeed upsell card, PDF download
- Drops list + detail (markdown, media, quiz, notes per drop, bookmark toggle)
- Native community: posts, comments, pin/delete (admin), foundational tier blocked from writes
- Weekly Biggest Win thread (auto-created per ISO-week)
- Manifesto + House Rules (admin-editable)
- Personal: notes archive, bookmarks list, progress (days since last login, days a member)
- Affiliate dashboard (50% share, code, link, referrals list)
- Billing: Stripe Customer Portal link, pause/resume, downgrade to foundational, cancel with visual loss list (9 bullets) + data wipe
- Stripe webhook handler (payment_failed → email, invoice.upcoming → email, subscription.deleted → tier=canceled)
- Admin portal tabs: Checklist (10 seeded items), Drops CRUD with schedule/foundational/quick-win/a-la-carte, Members table, Monthly Summary editor + sender, Community (manifesto + rules editors), Reminders (2/2 sales + 2/2 nurture daily counters + custom reminders), Email Log (queued + sent), Launch (press button → starts 21-day promo)
- Background scheduler: publishes due drops, winback (14 days), weekly win thread, monthly summaries
- 300-member cap → doors close + waitlist
- Founder $44 promo → $77 after 21 days of launch (automatic price switch)
- PDF "Mammon Breaker Activation Codes" generator (regenerable from admin)
- Comprehensive deliverable checklist at `/app/CREATOR_DELIVERABLE_CHECKLIST.md`

## Backlog (P1)
- Real Stripe live key + webhook signature validation (`stripe.Webhook.construct_event`)
- Quiz authoring UI in admin (currently API-only)
- Learning path authoring UI (currently API-only)
- KingdomTitleDeed.com monthly upsell email send button in admin
- A-la-carte purchase modal directly on `/drops/:id` (currently scaffolded)
- Affiliate auto-tag from `?ref=` query param into checkout metadata

## Backlog (P2)
- Split server.py into routers (auth/admin/community/drops/billing/...) — currently 1140 lines
- Stripe Customer Portal config validation
- Mobile bottom-nav polish
- Server-side rendered open-graph card for landing
- 2nd marketing page variant for A/B test

## Status
- Backend pytest: 35/35 pass + 1 documented xfail
- Frontend smoke: landing/pricing/signup/login/admin all green
