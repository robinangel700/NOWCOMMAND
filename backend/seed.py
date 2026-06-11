"""Idempotent seeders for admin user, default settings, and deliverable checklist."""
import os
import uuid
from db import get_db, now_iso
from auth import hash_password


DEFAULT_CHECKLIST = [
    ("Set your creator profile", "Upload a profile picture, cover image, and bio in Admin > Profile. Members see this on your posts and across the community.", "/admin?tab=profile"),
    ("Upload the final Mammon Breaker PDF", "Drop the polished PDF into /app/backend/static/downloads/mammon_breaker_activation_codes.pdf then press 'Regenerate' in Admin > Launch.", "/admin?tab=launch"),
    ("Write your One Page Manifesto", "Admin > Community > Manifesto. Members see it pinned in the community and on /about.", "/admin?tab=community"),
    ("Approve the community house rules", "Admin > Community > Rules. Edit or accept defaults.", "/admin?tab=community"),
    ("Write 3 free blog posts", "Admin > Articles > New. Mark vault=OFF. Free posts are the hero of the public site and drive opt-ins.", "/admin?tab=articles"),
    ("Write 5 vault articles (members only)", "Admin > Articles > New, mark vault=ON. These are enticing previews on the public blog and full reads inside the membership.", "/admin?tab=articles"),
    ("Schedule the first 4 Wednesday drops", "Admin > Drops > New. Set scheduled_for to the next 4 Wednesdays.", "/admin?tab=drops"),
    ("Record 1 monthly quick-win asset (under 15 min)", "Upload as a Drop with Quick Win checked.", "/admin?tab=drops"),
    ("Set up your first a-la-carte drop", "Drop form, set alacarte_price_cents to enable single-asset purchase.", "/admin?tab=drops"),
    ("Customize your KingdomTitleDeed.com upsell", "Admin > Settings > Upsell (in Launch tab). Used for monthly upsell emails inside the membership.", "/admin?tab=launch"),
    ("Review every pre-written email", "Admin > Emails. Send a test of each one to yourself. Override copy if you want.", "/admin?tab=emails"),
    ("Confirm Stripe is connected with live keys", "Edit /app/backend/.env STRIPE_API_KEY to switch from test to live, then restart backend.", "/admin?tab=launch"),
    ("Confirm Resend is connected", "Edit /app/backend/.env RESEND_API_KEY. Until set, emails queue in Admin > Email Log.", "/admin?tab=launch"),
    ("Set this month's Executive Summary draft", "Admin > Summary. 3 bullets matters, 3 ignore, 1 resource. Save as draft.", "/admin?tab=summary"),
    ("Press LAUNCH", "Admin > Launch. Starts the 3-week $44 promo window and unlocks public signup.", "/admin?tab=launch"),
]


# Items added in later releases. Seeded only if missing by title.
_LATER_ITEMS = [
    "Set your creator profile",
    "Write 3 free blog posts",
    "Write 5 vault articles (members only)",
    "Customize your KingdomTitleDeed.com upsell",
    "Review every pre-written email",
    "Confirm Resend is connected",
]


async def seed_all():
    db = get_db()

    # ---- Admin user
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": os.environ.get("ADMIN_NAME", "Robin Angel"),
            "password_hash": hash_password(os.environ["ADMIN_PASSWORD"]),
            "role": "admin",
            "tier": "admin",
            "stripe_customer_id": None,
            "stripe_subscription_id": None,
            "last_login": now_iso(),
            "created_at": now_iso(),
            "affiliate_code": "ROBIN",
            "affiliate_earnings_cents": 0,
            "is_active": True,
            "downloads_available": ["mammon_breaker"],
        })
    else:
        # Always reset admin password to env value so it stays in sync.
        await db.users.update_one({"email": admin_email}, {"$set": {
            "password_hash": hash_password(os.environ["ADMIN_PASSWORD"]),
            "role": "admin",
            "tier": "admin",
        }})

    # ---- Settings
    defaults = {
        "launch": {"launched": False, "launch_date": None, "promo_days": int(os.environ.get("LAUNCH_PROMO_DAYS", 21))},
        "doors": {"open": True, "cap": int(os.environ.get("MEMBERSHIP_CAP", 300))},
        "manifesto": {"body_md": (
            "# The NOWCOMMAND Manifesto\n\n"
            "We do not chase money. We assign it.\n\n"
            "We do not negotiate with delay. We evict it.\n\n"
            "We do not wait for the right time. We carry it.\n\n"
            "We rule over the increase. We operate in Kairos. We rest as sovereigns.\n\n"
            "*— Robin Angel*"
        )},
        "community_rules": {"body_md": (
            "1. Speak from dominion, not from desperation.\n"
            "2. Celebrate wins — even small ones — in the weekly thread.\n"
            "3. No selling, no funnel-dumping, no DM-pitching members.\n"
            "4. Confidentiality: what is shared here, stays here.\n"
            "5. Robin reserves the right to moderate. Dominion energy only."
        )},
        "kingdom_upsell": {
            "url": "https://KingdomTitleDeed.com",
            "headline": "The next step beyond NOWCOMMAND",
            "copy": (
                "Once the codes activate, the next move is the Title Deed. "
                "KingdomTitleDeed.com is where you go from commanding the increase "
                "to legally inheriting the territory. Read it slowly. Then act."
            ),
        },
        "reminder_cadence": {"sales_posts_per_day": 2, "nurture_posts_per_day": 2},
    }
    for k, v in defaults.items():
        existing_s = await db.settings.find_one({"key": k})
        if not existing_s:
            await db.settings.insert_one({"key": k, "value": v, "updated_at": now_iso()})

    # ---- Deliverable checklist
    # Remove legacy MVP titles that have been superseded by new richer items
    LEGACY_TITLES = [
        "Upload final Mammon Breaker Activation Codes PDF",
        "Schedule your first 4 Wednesday Drops",
        "Set this month's Executive Summary",
        "Decide first a-la-carte drop & price",
        "Set KingdomTitleDeed upsell copy",
        "Approve community rules",
    ]
    await db.checklist.delete_many({"title": {"$in": LEGACY_TITLES}, "done": False})

    # Force-refresh description on the canonical items (handles wording updates like 'pronouns' removal).
    for title, desc, link in DEFAULT_CHECKLIST:
        await db.checklist.update_one(
            {"title": title},
            {"$set": {"description": desc, "link": link}},
        )

    existing_titles = {it["title"] async for it in db.checklist.find({}, {"title": 1, "_id": 0})}
    if not existing_titles:
        for i, (title, desc, link) in enumerate(DEFAULT_CHECKLIST):
            await db.checklist.insert_one({
                "id": str(uuid.uuid4()),
                "title": title,
                "description": desc,
                "link": link,
                "done": False,
                "order": i,
                "created_at": now_iso(),
            })
    else:
        # Migrate: ensure newly-added items exist, and add 'link' to old rows.
        existing_max_order = 0
        async for it in db.checklist.find({}, {"order": 1, "_id": 0}):
            existing_max_order = max(existing_max_order, it.get("order", 0))
        for title, desc, link in DEFAULT_CHECKLIST:
            if title not in existing_titles:
                existing_max_order += 1
                await db.checklist.insert_one({
                    "id": str(uuid.uuid4()),
                    "title": title,
                    "description": desc,
                    "link": link,
                    "done": False,
                    "order": existing_max_order,
                    "created_at": now_iso(),
                })
        # backfill link field on legacy rows
        for title, desc, link in DEFAULT_CHECKLIST:
            await db.checklist.update_one(
                {"title": title, "$or": [{"link": {"$exists": False}}, {"link": ""}]},
                {"$set": {"link": link}},
            )
