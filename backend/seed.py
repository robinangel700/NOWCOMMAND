"""Idempotent seeders for admin user, default settings, and deliverable checklist."""
import os
import uuid
from db import get_db, now_iso
from auth import hash_password


DEFAULT_CHECKLIST = [
    ("Upload final Mammon Breaker Activation Codes PDF", "Replace the placeholder under Admin > Downloads."),
    ("Write your One Page Manifesto", "Set it in Admin > Community > Manifesto. Members see it pinned in the community."),
    ("Schedule your first 4 Wednesday Drops", "Use Admin > Drops > New. Set scheduled_for to upcoming Wednesdays."),
    ("Set this month's Executive Summary", "Admin > Summary. 3 bullets of what matters, 3 of what to ignore, 1 resource."),
    ("Record 1 monthly quick-win asset (under 15 min)", "Upload as a Drop with the Quick Win tag."),
    ("Decide first a-la-carte drop & price", "Admin > Drops > set alacarte_price_cents to enable single-asset purchase."),
    ("Set KingdomTitleDeed upsell copy", "Admin > Settings > Upsell. Used for monthly upsell emails."),
    ("Confirm Stripe is connected with live keys", "Edit /app/backend/.env STRIPE_API_KEY to switch from test to live."),
    ("Approve community rules", "Admin > Community > Rules. Members see these before posting."),
    ("Press LAUNCH", "Admin > Launch. Starts the 3-week $44 promo window and unlocks public signup."),
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
            "# The NOWREALM Manifesto\n\n"
            "We do not chase money. We assign it.\n\n"
            "We do not negotiate with delay. We evict it.\n\n"
            "We do not wait for the right time. We carry it.\n\n"
            "We rule over the increase. We operate in Kairos. We rest as sovereigns.\n\n"
            "*\u2014 Robin Angel*"
        )},
        "community_rules": {"body_md": (
            "1. Speak from dominion, not from desperation.\n"
            "2. Celebrate wins \u2014 even small ones \u2014 in the weekly thread.\n"
            "3. No selling, no funnel-dumping, no DM-pitching members.\n"
            "4. Confidentiality: what is shared here, stays here.\n"
            "5. Robin reserves the right to moderate. Dominion energy only."
        )},
        "kingdom_upsell": {
            "url": "https://KingdomTitleDeed.com",
            "headline": "The next step beyond NOWREALM",
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

    # ---- Deliverable checklist (only seed if empty)
    if await db.checklist.count_documents({}) == 0:
        for i, (title, desc) in enumerate(DEFAULT_CHECKLIST):
            await db.checklist.insert_one({
                "id": str(uuid.uuid4()),
                "title": title,
                "description": desc,
                "done": False,
                "order": i,
                "created_at": now_iso(),
            })
