"""Background scheduler -- publishes scheduled drops & articles, win-back, weekly win thread."""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from db import get_db, now_iso
from services.email_service import send_email, wrap_html
import os

log = logging.getLogger("scheduler")

_task = None


async def _publish_due_drops():
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    cursor = db.drops.find({"published": False, "scheduled_for": {"$ne": None, "$lte": now}})
    async for d in cursor:
        await db.drops.update_one({"id": d["id"]}, {"$set": {"published": True, "published_at": now}})
        log.info("Auto-published drop %s", d.get("title"))
        # Create gold-banner community post if announcement supplied
        if d.get("community_announcement"):
            import uuid as _uuid
            admin = await db.users.find_one({"role": "admin"})
            if admin:
                await db.posts.insert_one({
                    "id": str(_uuid.uuid4()),
                    "user_id": admin["id"],
                    "user_name": admin.get("name", "Robin Angel"),
                    "user_role": "admin",
                    "user_avatar": admin.get("avatar_url", ""),
                    "body": d["community_announcement"],
                    "kind": "new_drop_announcement",
                    "drop_id": d["id"],
                    "drop_title": d["title"],
                    "gold_banner": True,
                    "pinned": True,
                    "deleted": False,
                    "created_at": now_iso(),
                })
        try:
            import email_templates as et
            subj, html = et.render("drop_published", {
                "title": d["title"],
                "preview": d.get("insight_preview") or "A new transmission just landed.",
                "frontend": os.environ.get("FRONTEND_BASE_URL", ""),
            })
        except Exception:
            subj, html = f"NEW DROP: {d['title']}", wrap_html(d["title"], "A new transmission landed.")
        async for u in db.users.find({"tier": {"$in": ["full", "foundational"]}}):
            if d.get("foundational") is False and u.get("tier") == "foundational":
                continue
            prefs = u.get("notif_prefs") or {}
            if prefs.get("member_drop_announcement", True) is False:
                continue
            await send_email(u["email"], subj, html, kind="drop_published")


async def _publish_due_articles():
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    cursor = db.articles.find({"published": False, "scheduled_for": {"$ne": None, "$lte": now}})
    async for a in cursor:
        await db.articles.update_one({"id": a["id"]}, {"$set": {"published": True, "published_at": now}})
        log.info("Auto-published article %s", a.get("title"))
        try:
            import email_templates as et
            subj, html = et.render("article_published", {
                "title": a["title"],
                "excerpt": a.get("excerpt") or "",
                "slug": a["slug"],
                "vault": a.get("vault", False),
                "frontend": os.environ.get("FRONTEND_BASE_URL", ""),
            })
        except Exception:
            subj, html = a["title"], wrap_html(a["title"], a.get("excerpt") or "")
        if a.get("vault"):
            # send to active members
            async for u in db.users.find({"tier": {"$in": ["full", "foundational"]}}):
                await send_email(u["email"], subj, html, kind="article_published_vault")
        else:
            # send to members + leads
            async for u in db.users.find({"tier": {"$in": ["full", "foundational"]}}):
                await send_email(u["email"], subj, html, kind="article_published")
            async for lead in db.leads.find({}):
                await send_email(lead["email"], subj, html, kind="article_published_lead")


async def _winback_inactive():
    db = get_db()
    threshold = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    cursor = db.users.find({"tier": {"$in": ["full", "foundational"]}, "last_login": {"$lt": threshold}})
    async for u in cursor:
        last_wb = u.get("last_winback_at")
        if last_wb and last_wb > (datetime.now(timezone.utc) - timedelta(days=7)).isoformat():
            continue
        topic = "your dominion work"
        recent_note = await db.notes.find_one({"user_id": u["id"]}, sort=[("updated_at", -1)])
        if recent_note:
            d = await db.drops.find_one({"id": recent_note.get("drop_id")})
            if d:
                topic = d.get("title", topic)
        else:
            d = await db.drops.find_one({"published": True}, sort=[("published_at", -1)])
            if d:
                topic = d.get("title", topic)
        try:
            import email_templates as et
            subj, html = et.render("winback", {"topic": topic, "frontend": os.environ.get("FRONTEND_BASE_URL", "")})
        except Exception:
            subj, html = "I noticed you stepped away", wrap_html("Step back in", f"<p>You were on {topic}.</p>")
        await send_email(u["email"], subj, html, kind="winback")
        await db.users.update_one({"id": u["id"]}, {"$set": {"last_winback_at": now_iso()}})


async def _ensure_weekly_win_thread():
    db = get_db()
    now = datetime.now(timezone.utc)
    week_key = f"{now.year}-W{now.isocalendar().week:02d}"
    existing = await db.weekly_win_threads.find_one({"week_key": week_key})
    if existing:
        return
    admin = await db.users.find_one({"role": "admin"})
    if not admin:
        return
    import uuid
    post_id = str(uuid.uuid4())
    body = (
        f"Weekly Biggest Win Thread — {now.strftime('%B %d, %Y')}\n\n"
        "What is the biggest win the codes produced for you this week? "
        "Even a small shift counts — momentum compounds. Drop it below."
    )
    await db.posts.insert_one({
        "id": post_id,
        "user_id": admin["id"],
        "user_name": admin.get("name", "Robin Angel"),
        "user_role": "admin",
        "user_avatar": admin.get("avatar_url", ""),
        "body": body,
        "kind": "win",
        "pinned": True,
        "deleted": False,
        "created_at": now_iso(),
    })
    await db.weekly_win_threads.insert_one({
        "id": str(uuid.uuid4()),
        "week_key": week_key,
        "post_id": post_id,
        "created_at": now_iso(),
    })


async def _publish_due_summaries():
    db = get_db()
    now = now_iso()
    async for s in db.monthly_summaries.find({"sent": False, "send_at": {"$lte": now}}):
        await _send_summary(s)
        await db.monthly_summaries.update_one({"id": s["id"]}, {"$set": {"sent": True, "sent_at": now}})


async def _send_summary(s: dict):
    db = get_db()
    try:
        import email_templates as et
        subj, html = et.render("monthly_summary", {
            "matters": s.get("matters", []),
            "ignore": s.get("ignore", []),
            "one_resource": s.get("one_resource", ""),
            "frontend": os.environ.get("FRONTEND_BASE_URL", ""),
        })
    except Exception:
        subj, html = "Monthly summary", wrap_html("Summary", "<p>See dashboard.</p>")
    async for u in db.users.find({"tier": {"$in": ["full", "foundational"]}}):
        await send_email(u["email"], subj, html, kind="monthly_summary")


async def ensure_indexes():
    """Create useful indexes -- safe to call repeatedly."""
    db = get_db()
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("affiliate_code")
        await db.users.create_index("tier")
        await db.users.create_index("last_login")
        await db.drops.create_index("id", unique=True)
        await db.drops.create_index([("published", 1), ("scheduled_for", 1)])
        await db.drops.create_index("published_at")
        await db.articles.create_index("id", unique=True)
        await db.articles.create_index("slug", unique=True)
        await db.articles.create_index([("published", 1), ("vault", 1), ("published_at", -1)])
        await db.articles.create_index("tags")
        await db.posts.create_index([("deleted", 1), ("pinned", -1), ("created_at", -1)])
        await db.posts.create_index("user_id")
        await db.comments.create_index([("post_id", 1), ("created_at", 1)])
        await db.notes.create_index([("user_id", 1), ("drop_id", 1)], unique=True)
        await db.bookmarks.create_index([("user_id", 1), ("drop_id", 1)], unique=True)
        await db.alacarte_unlocks.create_index([("user_id", 1), ("drop_id", 1)], unique=True)
        await db.payment_transactions.create_index("session_id", unique=True)
        await db.leads.create_index("email", unique=True)
        await db.waitlist.create_index("email", unique=True)
        await db.emails_outbox.create_index("created_at")
        log.info("Mongo indexes ensured")
    except Exception:
        log.exception("ensure_indexes failed (continuing)")


async def _vault_teaser_sweep():
    db = get_db()
    now = datetime.now(timezone.utc)
    tomorrow_iso = (now + timedelta(days=1)).isoformat()
    a = await db.articles.find_one({
        "published": False, "vault": True,
        "scheduled_for": {"$gte": now.isoformat(), "$lte": tomorrow_iso},
        "vault_teaser_sent": {"$ne": True},
    }, sort=[("scheduled_for", 1)])
    if not a:
        return
    try:
        import email_templates as et
        subj, html = et.render("vault_teaser", {"title": a["title"], "frontend": os.environ.get("FRONTEND_BASE_URL", "")})
    except Exception:
        return
    async for lead in db.leads.find({}):
        await send_email(lead["email"], subj, html, kind="vault_teaser")
    await db.articles.update_one({"id": a["id"]}, {"$set": {"vault_teaser_sent": True, "vault_teaser_at": now_iso()}})


async def _loop():
    await ensure_indexes()
    while True:
        try:
            await _publish_due_drops()
            await _publish_due_articles()
            await _winback_inactive()
            await _ensure_weekly_win_thread()
            await _publish_due_summaries()
            await _vault_teaser_sweep()
            now = datetime.now(timezone.utc)
            if now.hour == 14:
                await _daily_digest()
        except Exception:
            log.exception("scheduler tick failed")
        await asyncio.sleep(60)


def start():
    global _task
    if _task is None or _task.done():
        _task = asyncio.create_task(_loop())
    return _task
