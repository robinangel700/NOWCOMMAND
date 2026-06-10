"""Background scheduler -- publishes scheduled drops, runs win-back, weekly win thread."""
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
        # Notify all active members
        async for u in db.users.find({"tier": {"$in": ["full", "foundational"]}}):
            if d.get("foundational") is False and u.get("tier") == "foundational":
                continue  # foundational users only see foundational content
            await send_email(
                to=u["email"],
                subject=f"NEW DROP: {d['title']}",
                html=wrap_html(d["title"],
                               f"<p>{d.get('insight_preview') or 'A new transmission just landed in your NOWREALM dashboard.'}</p>",
                               cta_url=f"{os.environ.get('FRONTEND_BASE_URL','')}/dashboard",
                               cta_label="Open Dashboard"),
                kind="drop_published",
            )


async def _winback_inactive():
    db = get_db()
    threshold = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()
    cursor = db.users.find({"tier": {"$in": ["full", "foundational"]}, "last_login": {"$lt": threshold}})
    async for u in cursor:
        # don't re-email more than once a week
        last_wb = u.get("last_winback_at")
        if last_wb and last_wb > (datetime.now(timezone.utc) - timedelta(days=7)).isoformat():
            continue
        # find most recent note as topic anchor; fallback to latest drop
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
        await send_email(
            to=u["email"],
            subject="I noticed you stepped away \u2014 a 2-minute shortcut",
            html=wrap_html(
                "I noticed you stepped away",
                f"<p>I saw you were working on <strong>{topic}</strong> recently.</p>"
                f"<p>Here is a 2-minute shortcut to break the next bottleneck: come back, open the dashboard, and write one sentence in the Weekly Win thread. That single act re-anchors the codes.</p>"
                f"<p>Don\u2019t let Chronos eat your momentum. Kairos is still holding the door.</p>",
                cta_url=f"{os.environ.get('FRONTEND_BASE_URL','')}/dashboard",
                cta_label="Re-enter NOWREALM",
            ),
            kind="winback",
        )
        await db.users.update_one({"id": u["id"]}, {"$set": {"last_winback_at": now_iso()}})


async def _ensure_weekly_win_thread():
    """On Wednesdays (or every 7 days), make sure a 'biggest wins of the week' admin post exists."""
    db = get_db()
    now = datetime.now(timezone.utc)
    # Use week-key YYYY-WW
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
        f"Weekly Biggest Win Thread \u2014 {now.strftime('%B %d, %Y')}\n\n"
        "What is the biggest win the codes produced for you this week? "
        "Even a small shift counts \u2014 momentum compounds. Drop it below."
    )
    await db.posts.insert_one({
        "id": post_id,
        "user_id": admin["id"],
        "user_name": admin.get("name", "Robin Angel"),
        "user_role": "admin",
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
    """Send queued monthly summaries when their send_at passes."""
    db = get_db()
    now = now_iso()
    async for s in db.monthly_summaries.find({"sent": False, "send_at": {"$lte": now}}):
        await _send_summary(s)
        await db.monthly_summaries.update_one({"id": s["id"]}, {"$set": {"sent": True, "sent_at": now}})


async def _send_summary(s: dict):
    db = get_db()
    matters = "".join(f"<li>{m}</li>" for m in s.get("matters", []))
    ignore = "".join(f"<li>{i}</li>" for i in s.get("ignore", []))
    html = wrap_html(
        "Monthly Executive Summary",
        f"<h3 style='color:#D4AF37;font-family:Cormorant Garamond,serif'>What matters right now</h3><ul>{matters}</ul>"
        f"<h3 style='color:#D4AF37;font-family:Cormorant Garamond,serif'>What to ignore</h3><ul>{ignore}</ul>"
        f"<h3 style='color:#D4AF37;font-family:Cormorant Garamond,serif'>The one resource you need</h3><p>{s.get('one_resource','')}</p>",
        cta_url=f"{os.environ.get('FRONTEND_BASE_URL','')}/dashboard",
        cta_label="Open Dashboard",
    )
    async for u in db.users.find({"tier": {"$in": ["full", "foundational"]}}):
        await send_email(u["email"], "NOWREALM \u2014 Executive Summary", html, kind="monthly_summary")


async def _loop():
    while True:
        try:
            await _publish_due_drops()
            await _winback_inactive()
            await _ensure_weekly_win_thread()
            await _publish_due_summaries()
        except Exception:
            log.exception("scheduler tick failed")
        await asyncio.sleep(60)  # tick every minute


def start():
    global _task
    if _task is None or _task.done():
        _task = asyncio.create_task(_loop())
    return _task
