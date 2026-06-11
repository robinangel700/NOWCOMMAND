# NOWREALM — Creator Deliverable Checklist (Updated)

> The full 15-item launch checklist is now seeded into your portal at **`/admin?tab=checklist`**
> and also appears as a progress-bar wizard at **`/admin?tab=wizard`**. Every item links
> directly to the admin tab you need.

---

## 1. Profile & Identity
| # | Item | Where in portal |
|---|------|------------------|
| 1.1 | Set your creator profile (avatar, cover, bio, pronouns) | `/admin?tab=profile` |
| 1.2 | Write your One Page Manifesto | `/admin?tab=community` |
| 1.3 | Approve the community house rules | `/admin?tab=community` |

## 2. Content Library (do BEFORE launch)
| # | Item | Where |
|---|------|-------|
| 2.1 | Upload final Mammon Breaker Activation Codes PDF (replace placeholder under `/app/backend/static/downloads/`) then press "Regenerate" | `/admin?tab=launch` |
| 2.2 | Write **3 free blog posts** (mark vault=OFF). These power your funnel + SEO. | `/admin?tab=articles` |
| 2.3 | Write **5 vault articles** (mark vault=ON). Free blog teases vault on /blog. | `/admin?tab=articles` |
| 2.4 | Schedule the first 4 Wednesday drops | `/admin?tab=drops` |
| 2.5 | Record 1 monthly quick-win asset (under 15 min) | `/admin?tab=drops` |
| 2.6 | Set up your first a-la-carte drop | `/admin?tab=drops` |

## 3. Communication & Funnel
| # | Item | Where |
|---|------|-------|
| 3.1 | Customize your KingdomTitleDeed.com upsell copy (used in monthly upsell emails inside the membership only) | `/admin?tab=launch` |
| 3.2 | Review every pre-written email (13 templates ready to fire). Send a test of each to yourself. Override copy per template if you want. | `/admin?tab=emails` |
| 3.3 | Set this month's Executive Summary draft (3 matters / 3 ignore / 1 resource) | `/admin?tab=summary` |

## 4. Infrastructure
| # | Item | Where |
|---|------|-------|
| 4.1 | Confirm **Stripe** is connected with live keys (edit `/app/backend/.env` → `STRIPE_API_KEY=sk_live_...` → restart backend) | `/admin?tab=launch` |
| 4.2 | Confirm **Resend** is connected (edit `/app/backend/.env` → `RESEND_API_KEY=re_...` → restart backend). Until set, all emails queue in `/admin?tab=email-log`. | `/admin?tab=launch` |

## 5. Press LAUNCH
| # | Item | Where |
|---|------|-------|
| 5.1 | Press LAUNCH (starts the 21-day $44 founder window; auto-switches to $77/mo after) | `/admin?tab=wizard` or `/admin?tab=launch` |

---

## What's automated for you

| Automation | Trigger |
|-------------|---------|
| Wednesday drop publishing | scheduled drops auto-publish + notify all eligible members by email |
| **Scheduled article publishing (free & vault)** | articles auto-publish at `scheduled_for` time |
| Win-back email to 14-day-inactive members | daily sweep, max once / 7 days |
| Weekly Biggest Win community thread | once per ISO-week, posted by Robin's admin account |
| Stripe payment-failed notification → email with 1-click update card | webhook `invoice.payment_failed` |
| Pre-renewal / card-expiration heads-up | webhook `invoice.upcoming` |
| Founder $44 → $77 switch | automatic at `launch_date + 21 days` |
| 300-member cap → doors close + waitlist captured | every public `/api/public/state` call |
| **Lead opt-in welcome email** | every `/api/public/lead` submission |
| **A-la-carte unlock email** | every successful a-la-carte purchase |
| **Cancel confirmation email** | every successful cancellation |
| **Article-published email** (free goes to members + leads; vault goes to members only) | every auto-publish |

## 13 pre-written email templates (all live at `/admin?tab=emails`)
1. Onboarding (purchase complete)
2. Win-back (14 days inactive)
3. Payment failed
4. Renewal heads-up / card expiration
5. New drop landed
6. New blog article (free → members + leads; vault → members)
7. Vault teaser (broadcast to free leads)
8. Monthly executive summary
9. Waitlist joined
10. Blog opt-in confirmation
11. Affiliate payout credited
12. A-la-carte unlocked
13. Cancellation confirmation

Each template has a **"Send test to me"** button. Each one can be previewed in an iframe. None of them require you to write anything to go live.
