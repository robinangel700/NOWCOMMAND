"""NOWREALM API server."""
import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from db import get_db, now_iso, serialize
from auth import (
    hash_password, verify_password, create_token,
    get_current_user, require_admin,
)
from models import (
    SignupIn, LoginIn, CheckoutIn, AlacarteCheckoutIn, DropIn, DropUpdate,
    PostIn, CommentIn, NoteIn, QuizIn, QuizAttemptIn, LearningPathIn,
    ChecklistItemIn, SettingsIn, MonthlySummaryIn, ReminderIn, CancelIn,
    WaitlistIn, ManifestoIn, ArticleIn, ArticleUpdate, LeadIn, ProfileIn,
    EmailTemplateUpdate,
)
from services import email_service, stripe_service, pdf_service, scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
log = logging.getLogger("nowrealm")


# ---------- Lifespan: seed + start scheduler + generate PDF ----------
@asynccontextmanager
async def lifespan(_app: FastAPI):
    from seed import seed_all
    await seed_all()
    pdf_service.ensure_pdf()
    scheduler.start()
    log.info("NOWREALM started.")
    yield
    log.info("NOWREALM stopping.")


app = FastAPI(title="NOWREALM", lifespan=lifespan)
api = APIRouter(prefix="/api")

# ---- Static (PDF downloads) ----
STATIC_DIR = ROOT_DIR / "static"
STATIC_DIR.mkdir(exist_ok=True)
(STATIC_DIR / "downloads").mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# ---------- helpers ----------

def _public_user(u: dict) -> dict:
    u = dict(u)
    u.pop("password_hash", None)
    u.pop("_id", None)
    return u


async def _get_setting(key: str) -> Optional[dict]:
    db = get_db()
    s = await db.settings.find_one({"key": key}, {"_id": 0})
    return s["value"] if s else None


async def _set_setting(key: str, value: dict):
    db = get_db()
    await db.settings.update_one({"key": key}, {"$set": {"value": value, "updated_at": now_iso()}}, upsert=True)


async def _active_member_count() -> int:
    db = get_db()
    return await db.users.count_documents({"tier": {"$in": ["full", "foundational"]}})


async def _current_full_price_cents() -> int:
    """Return $44 (during promo) or $77 (after) based on launch settings."""
    launch = await _get_setting("launch") or {}
    promo_days = int(launch.get("promo_days", 21))
    promo_cents = int(os.environ.get("PRICE_FULL_MONTHLY_CENTS", 4400))
    after_cents = int(os.environ.get("PRICE_FULL_AFTER_PROMO_CENTS", 7700))
    if not launch.get("launched") or not launch.get("launch_date"):
        return promo_cents  # pre-launch shows promo
    launched_at = datetime.fromisoformat(launch["launch_date"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) <= launched_at + timedelta(days=promo_days):
        return promo_cents
    return after_cents


async def _promo_remaining_seconds() -> Optional[int]:
    launch = await _get_setting("launch") or {}
    if not launch.get("launched") or not launch.get("launch_date"):
        return None
    launched_at = datetime.fromisoformat(launch["launch_date"].replace("Z", "+00:00"))
    end = launched_at + timedelta(days=int(launch.get("promo_days", 21)))
    remaining = (end - datetime.now(timezone.utc)).total_seconds()
    return max(int(remaining), 0)


# ============================================================
#  PUBLIC
# ============================================================

@api.get("/")
async def root():
    return {"app": "NOWREALM", "status": "ok"}


@api.get("/public/state")
async def public_state():
    launch = await _get_setting("launch") or {}
    doors = await _get_setting("doors") or {"open": True, "cap": 300}
    count = await _active_member_count()
    return {
        "launched": bool(launch.get("launched")),
        "launch_date": launch.get("launch_date"),
        "promo_days": launch.get("promo_days", 21),
        "promo_remaining_seconds": await _promo_remaining_seconds(),
        "current_full_monthly_cents": await _current_full_price_cents(),
        "annual_cents": int(os.environ.get("PRICE_FULL_ANNUAL_CENTS", 50000)),
        "foundational_monthly_cents": int(os.environ.get("PRICE_FOUNDATIONAL_MONTHLY_CENTS", 1100)),
        "after_promo_monthly_cents": int(os.environ.get("PRICE_FULL_AFTER_PROMO_CENTS", 7700)),
        "active_members": count,
        "cap": doors.get("cap", 300),
        "doors_open": bool(doors.get("open", True)) and count < doors.get("cap", 300),
        "stripe_real": stripe_service.is_real_key(),
    }


@api.post("/public/waitlist")
async def join_waitlist(body: WaitlistIn):
    db = get_db()
    existing = await db.waitlist.find_one({"email": body.email.lower()})
    if existing:
        return {"status": "already_on_waitlist"}
    await db.waitlist.insert_one({
        "id": str(uuid.uuid4()),
        "email": body.email.lower(),
        "created_at": now_iso(),
    })
    await email_service.send_email(
        body.email,
        "You're on the NOWREALM waitlist",
        email_service.wrap_html(
            "You're on the list",
            "<p>The vault holds 300 seats. When one opens, you will be the first to know. Hold your posture.</p>",
        ),
        kind="waitlist",
    )
    return {"status": "joined"}


# ============================================================
#  AUTH
# ============================================================

@api.post("/auth/signup")
async def signup(body: SignupIn):
    db = get_db()
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(409, "An account with that email already exists.")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": body.name or email.split("@")[0],
        "password_hash": hash_password(body.password),
        "role": "member",
        "tier": "none",  # becomes 'full'/'foundational' on successful checkout
        "stripe_customer_id": None,
        "stripe_subscription_id": None,
        "stripe_plan": None,
        "last_login": now_iso(),
        "created_at": now_iso(),
        "affiliate_code": uuid.uuid4().hex[:8].upper(),
        "affiliate_earnings_cents": 0,
        "is_active": True,
        "downloads_available": [],
    }
    await db.users.insert_one(user)
    token = create_token(user["id"], "member")
    return {"token": token, "user": _public_user(user)}


@api.post("/auth/login")
async def login(body: LoginIn):
    db = get_db()
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(user["id"], user.get("role", "member"))
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_login": now_iso()}})
    return {"token": token, "user": _public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": _public_user(user)}


# ============================================================
#  CHECKOUT
# ============================================================

@api.post("/checkout/subscription")
async def checkout_subscription(body: CheckoutIn, user: dict = Depends(get_current_user)):
    db = get_db()

    # Doors check (300 cap)
    doors = await _get_setting("doors") or {"open": True, "cap": 300}
    count = await _active_member_count()
    if not doors.get("open", True) or count >= doors.get("cap", 300):
        raise HTTPException(403, "Doors are closed. Join the waitlist.")

    # If launched, after promo only allow current price (no $44 anymore).
    current_full = await _current_full_price_cents()

    cust_id = stripe_service.create_or_get_customer(user["email"], user.get("name"), user.get("stripe_customer_id"))
    if cust_id and cust_id != user.get("stripe_customer_id"):
        await db.users.update_one({"id": user["id"]}, {"$set": {"stripe_customer_id": cust_id}})

    metadata = {
        "user_id": user["id"],
        "email": user["email"],
        "plan": body.plan,
    }
    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/pricing?canceled=1"

    result = stripe_service.create_subscription_checkout(
        customer_id=cust_id,
        plan=body.plan,
        success_url=success_url,
        cancel_url=cancel_url,
        current_full_cents=current_full,
        metadata=metadata,
    )

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": result["session_id"],
        "user_id": user["id"],
        "user_email": user["email"],
        "type": "subscription",
        "plan": body.plan,
        "amount_cents": result.get("amount"),
        "currency": "usd",
        "status": "initiated",
        "payment_status": "pending",
        "stripe_customer_id": cust_id,
        "metadata": metadata,
        "dev_mode": result.get("dev_mode", False),
        "created_at": now_iso(),
    })
    return {"url": result["url"], "session_id": result["session_id"], "dev_mode": result.get("dev_mode", False)}


@api.post("/checkout/alacarte")
async def checkout_alacarte(body: AlacarteCheckoutIn, user: dict = Depends(get_current_user)):
    db = get_db()
    drop = await db.drops.find_one({"id": body.drop_id})
    if not drop or not drop.get("alacarte_price_cents"):
        raise HTTPException(404, "A-la-carte drop not found")

    cust_id = stripe_service.create_or_get_customer(user["email"], user.get("name"), user.get("stripe_customer_id"))
    if cust_id and cust_id != user.get("stripe_customer_id"):
        await db.users.update_one({"id": user["id"]}, {"$set": {"stripe_customer_id": cust_id}})

    metadata = {"user_id": user["id"], "drop_id": body.drop_id, "type": "alacarte"}
    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/dashboard?canceled=1"

    result = stripe_service.create_alacarte_checkout(
        customer_id=cust_id,
        amount_cents=int(drop["alacarte_price_cents"]),
        description=f"NOWREALM: {drop['title']}",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": result["session_id"],
        "user_id": user["id"],
        "user_email": user["email"],
        "type": "alacarte",
        "drop_id": body.drop_id,
        "amount_cents": int(drop["alacarte_price_cents"]),
        "currency": "usd",
        "status": "initiated",
        "payment_status": "pending",
        "stripe_customer_id": cust_id,
        "metadata": metadata,
        "dev_mode": result.get("dev_mode", False),
        "created_at": now_iso(),
    })
    return {"url": result["url"], "session_id": result["session_id"], "dev_mode": result.get("dev_mode", False)}


@api.get("/checkout/status/{session_id}")
async def checkout_status(session_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    tx = await db.payment_transactions.find_one({"session_id": session_id, "user_id": user["id"]}, {"_id": 0})
    if not tx:
        raise HTTPException(404, "Transaction not found")
    # If already finalized, return as-is (idempotency).
    if tx.get("payment_status") == "paid":
        return tx

    s = stripe_service.retrieve_session(session_id)
    payment_status = s.get("payment_status")
    status = s.get("status")
    update = {"payment_status": payment_status, "status": status, "updated_at": now_iso()}

    if payment_status == "paid":
        # Finalize: activate user / record alacarte / etc.
        if tx["type"] == "subscription":
            plan = tx.get("plan", "full_monthly")
            new_tier = "foundational" if plan == "foundational_monthly" else "full"
            sub_id = s.get("subscription") or f"sub_dev_{session_id}"
            await db.users.update_one({"id": user["id"]}, {"$set": {
                "tier": new_tier,
                "stripe_subscription_id": sub_id,
                "stripe_plan": plan,
                "downloads_available": list(set((user.get("downloads_available") or []) + ["mammon_breaker"])),
                "subscribed_at": now_iso(),
                "paused": False,
            }})
            # Affiliate credit if any
            ref = tx.get("metadata", {}).get("ref")
            amt = tx.get("amount_cents") or 0
            if ref:
                affiliate = await db.users.find_one({"affiliate_code": ref})
                if affiliate and affiliate["id"] != user["id"]:
                    payout = int(amt * 0.5)
                    await db.users.update_one({"id": affiliate["id"]}, {"$inc": {"affiliate_earnings_cents": payout}})
                    await db.affiliate_referrals.insert_one({
                        "id": str(uuid.uuid4()),
                        "affiliate_user_id": affiliate["id"],
                        "referred_email": user["email"],
                        "amount_cents": amt,
                        "payout_cents": payout,
                        "status": "credited",
                        "created_at": now_iso(),
                    })
            # Send onboarding + instant download link
            try:
                import email_templates as _et
                subj, html = _et.render("onboarding", {
                    "name": user.get("name", ""),
                    "frontend": os.environ.get("FRONTEND_BASE_URL", "").rstrip("/"),
                })
            except Exception:
                subj = "Welcome to NOWREALM"
                html = email_service.wrap_html("Welcome", "<p>Open your dashboard.</p>")
            await email_service.send_email(user["email"], subj, html, kind="onboarding")
        elif tx["type"] == "alacarte":
            drop_id = tx.get("drop_id")
            await db.alacarte_unlocks.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "drop_id": drop_id,
                "amount_cents": tx.get("amount_cents"),
                "created_at": now_iso(),
            })
            try:
                import email_templates as _et
                d = await db.drops.find_one({"id": drop_id}, {"_id": 0})
                subj, html = _et.render("alacarte_purchased", {
                    "title": (d or {}).get("title", "Your asset"),
                    "frontend": os.environ.get("FRONTEND_BASE_URL", "").rstrip("/"),
                })
                await email_service.send_email(user["email"], subj, html, kind="alacarte_purchased")
            except Exception:
                pass
        update["finalized_at"] = now_iso()

    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})
    tx2 = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    return tx2


@api.post("/billing/portal")
async def billing_portal(body: dict, user: dict = Depends(get_current_user)):
    cust_id = user.get("stripe_customer_id")
    if not cust_id:
        raise HTTPException(400, "No customer on file")
    s = stripe_service.create_portal_session(cust_id, body.get("return_url") or os.environ.get("FRONTEND_BASE_URL", ""))
    return s


@api.post("/billing/cancel")
async def billing_cancel(body: CancelIn, user: dict = Depends(get_current_user)):
    db = get_db()
    sub_id = user.get("stripe_subscription_id")
    if not sub_id:
        raise HTTPException(400, "No active subscription")
    if body.action == "pause":
        stripe_service.pause_subscription(sub_id)
        await db.users.update_one({"id": user["id"]}, {"$set": {"paused": True, "paused_at": now_iso()}})
        return {"status": "paused"}
    if body.action == "downgrade":
        amt = int(os.environ.get("PRICE_FOUNDATIONAL_MONTHLY_CENTS", 1100))
        stripe_service.update_subscription_price(sub_id, amt, "month", "NOWREALM Foundational")
        await db.users.update_one({"id": user["id"]}, {"$set": {"tier": "foundational", "stripe_plan": "foundational_monthly"}})
        return {"status": "downgraded", "tier": "foundational"}
    if body.action == "cancel":
        stripe_service.cancel_subscription(sub_id)
        # Per spec: all custom data disappears on cancel
        await db.notes.delete_many({"user_id": user["id"]})
        await db.bookmarks.delete_many({"user_id": user["id"]})
        await db.quiz_attempts.delete_many({"user_id": user["id"]})
        await db.learning_progress.delete_many({"user_id": user["id"]})
        await db.users.update_one({"id": user["id"]}, {"$set": {
            "tier": "canceled",
            "stripe_subscription_id": None,
            "downloads_available": [],
            "canceled_at": now_iso(),
            "cancel_reason": body.reason or "",
        }})
        return {"status": "canceled"}
    raise HTTPException(400, "Unknown action")


@api.post("/billing/resume")
async def billing_resume(user: dict = Depends(get_current_user)):
    db = get_db()
    sub_id = user.get("stripe_subscription_id")
    if not sub_id:
        raise HTTPException(400, "No subscription")
    stripe_service.resume_subscription(sub_id)
    await db.users.update_one({"id": user["id"]}, {"$set": {"paused": False, "resumed_at": now_iso()}})
    return {"status": "resumed"}


# ============================================================
#  STRIPE WEBHOOK (smart retry / card expiration / cancellations)
# ============================================================

@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    db = get_db()
    # In real mode, you'd validate signature. We log and act on event types.
    try:
        import json
        evt = json.loads(payload.decode("utf-8")) if payload else {}
    except Exception:
        evt = {}
    etype = evt.get("type", "")
    data = (evt.get("data") or {}).get("object") or {}
    cust_id = data.get("customer") or data.get("customer_id")
    user = None
    if cust_id:
        user = await db.users.find_one({"stripe_customer_id": cust_id})

    if etype == "invoice.payment_failed" and user:
        # Stripe handles smart retries automatically; we just notify member.
        await email_service.send_email(
            user["email"],
            "Payment hiccup \u2014 NOWREALM auto-retry scheduled",
            email_service.wrap_html(
                "A small detour, no breach.",
                "<p>Your last NOWREALM payment didn\u2019t go through. Stripe will retry automatically over the next several days.</p>"
                "<p>One click below updates your card in 10 seconds.</p>",
                cta_url=f"{os.environ.get('FRONTEND_BASE_URL','')}/billing",
                cta_label="Update card",
            ),
            kind="payment_failed",
        )
    elif etype == "invoice.upcoming" and user:
        # Pre-card expiration / pre-billing reminder
        await email_service.send_email(
            user["email"],
            "NOWREALM renewal preview",
            email_service.wrap_html(
                "Renewal preview",
                "<p>Your NOWREALM membership will renew shortly. If your card has changed, one click updates it.</p>",
                cta_url=f"{os.environ.get('FRONTEND_BASE_URL','')}/billing",
                cta_label="Manage Billing",
            ),
            kind="invoice_upcoming",
        )
    elif etype == "customer.subscription.deleted" and user:
        await db.users.update_one({"id": user["id"]}, {"$set": {"tier": "canceled"}})
    return {"received": True}


# ============================================================
#  DROPS
# ============================================================

def _drop_visible_to(d: dict, user: dict) -> bool:
    if not d.get("published"):
        return False
    if user.get("role") == "admin":
        return True
    if user.get("tier") == "full":
        return True
    if user.get("tier") == "foundational" and d.get("foundational"):
        return True
    return False


@api.get("/drops")
async def list_drops(user: dict = Depends(get_current_user)):
    db = get_db()
    out = []
    async for d in db.drops.find().sort("scheduled_for", -1):
        d.pop("_id", None)
        visible = _drop_visible_to(d, user)
        # Upcoming preview: members can see title + insight_preview even if not yet published
        if not visible and not d.get("published") and user.get("tier") in ("full", "foundational"):
            out.append({
                "id": d["id"],
                "title": d["title"],
                "insight_preview": d.get("insight_preview"),
                "scheduled_for": d.get("scheduled_for"),
                "tags": d.get("tags", []),
                "foundational": d.get("foundational", False),
                "quick_win": d.get("quick_win", False),
                "alacarte_price_cents": d.get("alacarte_price_cents"),
                "preview": True,
                "published": False,
            })
            continue
        if visible:
            d["preview"] = False
            out.append(d)
        elif d.get("alacarte_price_cents") and d.get("published"):
            # A-la-carte buyers can see locked drops; full body shown after unlock
            unlocked = await db.alacarte_unlocks.find_one({"user_id": user["id"], "drop_id": d["id"]})
            if not unlocked:
                out.append({
                    "id": d["id"],
                    "title": d["title"],
                    "insight_preview": d.get("insight_preview"),
                    "alacarte_price_cents": d.get("alacarte_price_cents"),
                    "locked": True,
                    "published": True,
                    "scheduled_for": d.get("scheduled_for"),
                })
            else:
                d["preview"] = False
                out.append(d)
    return {"drops": out}


@api.get("/drops/{drop_id}")
async def get_drop(drop_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    d = await db.drops.find_one({"id": drop_id}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Drop not found")
    if not _drop_visible_to(d, user):
        unlocked = await db.alacarte_unlocks.find_one({"user_id": user["id"], "drop_id": drop_id})
        if not unlocked:
            raise HTTPException(403, "Not unlocked")
    quiz = await db.quizzes.find_one({"drop_id": drop_id}, {"_id": 0})
    note = await db.notes.find_one({"user_id": user["id"], "drop_id": drop_id}, {"_id": 0})
    bookmarked = bool(await db.bookmarks.find_one({"user_id": user["id"], "drop_id": drop_id}))
    return {"drop": d, "quiz": quiz, "note": note, "bookmarked": bookmarked}


# ============================================================
#  NOTES / BOOKMARKS / PROGRESS
# ============================================================

@api.post("/notes")
async def save_note(body: NoteIn, user: dict = Depends(get_current_user)):
    db = get_db()
    existing = await db.notes.find_one({"user_id": user["id"], "drop_id": body.drop_id})
    if existing:
        await db.notes.update_one({"id": existing["id"]}, {"$set": {"body": body.body, "updated_at": now_iso()}})
        return {"status": "updated", "id": existing["id"]}
    nid = str(uuid.uuid4())
    await db.notes.insert_one({
        "id": nid, "user_id": user["id"], "drop_id": body.drop_id, "body": body.body,
        "created_at": now_iso(), "updated_at": now_iso(),
    })
    return {"status": "created", "id": nid}


@api.get("/notes")
async def list_notes(user: dict = Depends(get_current_user)):
    db = get_db()
    notes = await db.notes.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return {"notes": notes}


@api.post("/bookmarks/{drop_id}")
async def toggle_bookmark(drop_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    existing = await db.bookmarks.find_one({"user_id": user["id"], "drop_id": drop_id})
    if existing:
        await db.bookmarks.delete_one({"id": existing["id"]})
        return {"bookmarked": False}
    await db.bookmarks.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "drop_id": drop_id, "created_at": now_iso()})
    return {"bookmarked": True}


@api.get("/bookmarks")
async def list_bookmarks(user: dict = Depends(get_current_user)):
    db = get_db()
    bms = await db.bookmarks.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    return {"bookmarks": bms}


@api.get("/progress")
async def get_progress(user: dict = Depends(get_current_user)):
    db = get_db()
    total_drops = await db.drops.count_documents({"published": True})
    notes_count = await db.notes.count_documents({"user_id": user["id"]})
    bookmarks_count = await db.bookmarks.count_documents({"user_id": user["id"]})
    quiz_count = await db.quiz_attempts.count_documents({"user_id": user["id"]})
    last_login = user.get("last_login")
    days_since = None
    if last_login:
        try:
            days_since = (datetime.now(timezone.utc) - datetime.fromisoformat(last_login.replace("Z", "+00:00"))).days
        except Exception:
            days_since = None
    sub_at = user.get("subscribed_at")
    days_member = None
    if sub_at:
        try:
            days_member = (datetime.now(timezone.utc) - datetime.fromisoformat(sub_at.replace("Z", "+00:00"))).days
        except Exception:
            days_member = None
    return {
        "total_drops": total_drops,
        "notes_count": notes_count,
        "bookmarks_count": bookmarks_count,
        "quizzes_taken": quiz_count,
        "days_since_last_login": days_since,
        "days_a_member": days_member,
    }


# ============================================================
#  QUIZZES
# ============================================================

@api.post("/quizzes/{quiz_id}/attempt")
async def submit_quiz(quiz_id: str, body: QuizAttemptIn, user: dict = Depends(get_current_user)):
    db = get_db()
    quiz = await db.quizzes.find_one({"id": quiz_id}, {"_id": 0})
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    score = 0
    for i, q in enumerate(quiz.get("questions", [])):
        if i < len(body.answers) and body.answers[i] == q.get("correct_index"):
            score += 1
    total = len(quiz.get("questions", []))
    await db.quiz_attempts.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "quiz_id": quiz_id,
        "answers": body.answers,
        "score": score,
        "total": total,
        "created_at": now_iso(),
    })
    return {"score": score, "total": total}


# ============================================================
#  LEARNING PATHS
# ============================================================

@api.get("/learning-paths")
async def list_paths(user: dict = Depends(get_current_user)):
    db = get_db()
    paths = await db.learning_paths.find({}, {"_id": 0}).to_list(100)
    progress = {p["path_id"]: p for p in await db.learning_progress.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)}
    for p in paths:
        prog = progress.get(p["id"], {})
        p["completed_drop_ids"] = prog.get("completed_drop_ids", [])
    return {"paths": paths}


@api.post("/learning-paths/{path_id}/complete/{drop_id}")
async def mark_path_drop_complete(path_id: str, drop_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    existing = await db.learning_progress.find_one({"user_id": user["id"], "path_id": path_id})
    if existing:
        completed = set(existing.get("completed_drop_ids", []))
        completed.add(drop_id)
        await db.learning_progress.update_one({"id": existing["id"]}, {"$set": {
            "completed_drop_ids": list(completed), "updated_at": now_iso(),
        }})
    else:
        await db.learning_progress.insert_one({
            "id": str(uuid.uuid4()), "user_id": user["id"], "path_id": path_id,
            "completed_drop_ids": [drop_id], "updated_at": now_iso(),
        })
    return {"status": "ok"}


# ============================================================
#  COMMUNITY (posts, comments, moderation)
# ============================================================

def _is_member_or_admin(user: dict) -> bool:
    return user.get("role") == "admin" or user.get("tier") in ("full", "foundational")


def _is_full_member_or_admin(user: dict) -> bool:
    return user.get("role") == "admin" or user.get("tier") == "full"


@api.get("/community/feed")
async def community_feed(user: dict = Depends(get_current_user)):
    if not _is_member_or_admin(user):
        raise HTTPException(403, "Members only")
    db = get_db()
    posts = []
    async for p in db.posts.find({"deleted": {"$ne": True}}).sort([("pinned", -1), ("created_at", -1)]).limit(200):
        p.pop("_id", None)
        c_count = await db.comments.count_documents({"post_id": p["id"], "deleted": {"$ne": True}})
        p["comment_count"] = c_count
        posts.append(p)
    rules = await _get_setting("community_rules")
    manifesto = await _get_setting("manifesto")
    return {"posts": posts, "rules": rules, "manifesto": manifesto}


@api.post("/community/posts")
async def create_post(body: PostIn, user: dict = Depends(get_current_user)):
    if not _is_full_member_or_admin(user):
        raise HTTPException(403, "Sovereign tier only")
    db = get_db()
    pid = str(uuid.uuid4())
    await db.posts.insert_one({
        "id": pid,
        "user_id": user["id"],
        "user_name": user.get("name", user["email"]),
        "user_role": user.get("role", "member"),
        "user_avatar": user.get("avatar_url", ""),
        "body": body.body,
        "kind": body.kind,
        "pinned": False,
        "deleted": False,
        "created_at": now_iso(),
    })
    return {"id": pid}


@api.get("/community/posts/{post_id}/comments")
async def get_comments(post_id: str, user: dict = Depends(get_current_user)):
    if not _is_member_or_admin(user):
        raise HTTPException(403, "Members only")
    db = get_db()
    rows = await db.comments.find({"post_id": post_id, "deleted": {"$ne": True}}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return {"comments": rows}


@api.post("/community/posts/{post_id}/comments")
async def add_comment(post_id: str, body: CommentIn, user: dict = Depends(get_current_user)):
    if not _is_full_member_or_admin(user):
        raise HTTPException(403, "Sovereign tier only")
    db = get_db()
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(404, "Post not found")
    cid = str(uuid.uuid4())
    await db.comments.insert_one({
        "id": cid, "post_id": post_id, "user_id": user["id"],
        "user_name": user.get("name", user["email"]), "user_role": user.get("role", "member"),
        "user_avatar": user.get("avatar_url", ""),
        "body": body.body, "deleted": False, "created_at": now_iso(),
    })
    return {"id": cid}


@api.delete("/community/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    p = await db.posts.find_one({"id": post_id})
    if not p:
        raise HTTPException(404, "Not found")
    if user.get("role") != "admin" and p.get("user_id") != user["id"]:
        raise HTTPException(403, "Forbidden")
    await db.posts.update_one({"id": post_id}, {"$set": {"deleted": True, "deleted_at": now_iso()}})
    return {"status": "ok"}


@api.delete("/community/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    c = await db.comments.find_one({"id": comment_id})
    if not c:
        raise HTTPException(404, "Not found")
    if user.get("role") != "admin" and c.get("user_id") != user["id"]:
        raise HTTPException(403, "Forbidden")
    await db.comments.update_one({"id": comment_id}, {"$set": {"deleted": True, "deleted_at": now_iso()}})
    return {"status": "ok"}


@api.post("/community/posts/{post_id}/pin")
async def pin_post(post_id: str, user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    p = await db.posts.find_one({"id": post_id})
    if not p:
        raise HTTPException(404, "Not found")
    await db.posts.update_one({"id": post_id}, {"$set": {"pinned": not p.get("pinned", False)}})
    return {"pinned": not p.get("pinned", False)}


# ============================================================
#  AFFILIATE
# ============================================================

@api.get("/affiliate/me")
async def affiliate_me(user: dict = Depends(get_current_user)):
    db = get_db()
    refs = await db.affiliate_referrals.find({"affiliate_user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    fe = os.environ.get("FRONTEND_BASE_URL", "").rstrip("/")
    return {
        "code": user.get("affiliate_code"),
        "link": f"{fe}/?ref={user.get('affiliate_code')}",
        "earnings_cents": user.get("affiliate_earnings_cents", 0),
        "referrals": refs,
    }


# ============================================================
#  DOWNLOADS
# ============================================================

@api.get("/downloads/mammon_breaker")
async def download_mammon_breaker(user: dict = Depends(get_current_user)):
    if "mammon_breaker" not in (user.get("downloads_available") or []) and user.get("role") != "admin":
        raise HTTPException(403, "Not unlocked")
    pdf_path = pdf_service.ensure_pdf()
    return FileResponse(pdf_path, media_type="application/pdf", filename="Mammon_Breaker_Activation_Codes.pdf")


# ============================================================
#  ADMIN: drops, settings, checklist, summary, members, reminders, launch
# ============================================================

@api.post("/admin/drops")
async def admin_create_drop(body: DropIn, user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    did = str(uuid.uuid4())
    published = False
    published_at = None
    if not body.scheduled_for:
        # If no schedule, publish immediately.
        published = True
        published_at = now_iso()
    doc = {
        "id": did,
        "title": body.title,
        "body_md": body.body_md,
        "media_url": body.media_url,
        "foundational": body.foundational,
        "scheduled_for": body.scheduled_for,
        "insight_preview": body.insight_preview,
        "quick_win": body.quick_win,
        "alacarte_price_cents": body.alacarte_price_cents,
        "tags": body.tags,
        "published": published,
        "published_at": published_at,
        "created_at": now_iso(),
        "created_by": user["id"],
    }
    await db.drops.insert_one(doc)
    doc.pop("_id", None)
    return {"drop": doc}


@api.patch("/admin/drops/{drop_id}")
async def admin_update_drop(drop_id: str, body: DropUpdate, user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    update = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if update.get("published") is True:
        update["published_at"] = now_iso()
    await db.drops.update_one({"id": drop_id}, {"$set": update})
    d = await db.drops.find_one({"id": drop_id}, {"_id": 0})
    return {"drop": d}


@api.delete("/admin/drops/{drop_id}")
async def admin_delete_drop(drop_id: str, user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    await db.drops.delete_one({"id": drop_id})
    return {"status": "ok"}


@api.get("/admin/drops")
async def admin_list_drops(user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    drops = await db.drops.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"drops": drops}


@api.get("/admin/checklist")
async def admin_checklist(user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    items = await db.checklist.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return {"items": items}


@api.patch("/admin/checklist/{item_id}")
async def admin_checklist_toggle(item_id: str, body: dict, user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    await db.checklist.update_one({"id": item_id}, {"$set": {"done": bool(body.get("done")), "updated_at": now_iso()}})
    item = await db.checklist.find_one({"id": item_id}, {"_id": 0})
    return {"item": item}


@api.post("/admin/checklist")
async def admin_checklist_add(body: ChecklistItemIn, user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    count = await db.checklist.count_documents({})
    doc = {"id": str(uuid.uuid4()), "title": body.title, "description": body.description or "", "done": False, "order": count, "created_at": now_iso()}
    await db.checklist.insert_one(doc)
    doc.pop("_id", None)
    return {"item": doc}


@api.post("/admin/launch")
async def admin_launch(user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    incomplete = await db.checklist.count_documents({"done": False})
    settings = await _get_setting("launch") or {}
    settings["launched"] = True
    settings["launch_date"] = now_iso()
    settings["promo_days"] = int(os.environ.get("LAUNCH_PROMO_DAYS", 21))
    settings["checklist_incomplete_at_launch"] = incomplete
    await _set_setting("launch", settings)
    return {"launched": True, "launch_date": settings["launch_date"], "promo_days": settings["promo_days"], "checklist_incomplete": incomplete}


@api.post("/admin/settings")
async def admin_set_settings(body: SettingsIn, user: dict = Depends(get_current_user)):
    await require_admin(user)
    await _set_setting(body.key, body.value)
    return {"key": body.key, "value": body.value}


@api.get("/admin/settings/{key}")
async def admin_get_settings(key: str, user: dict = Depends(get_current_user)):
    await require_admin(user)
    v = await _get_setting(key)
    return {"key": key, "value": v}


@api.get("/admin/members")
async def admin_members(user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    members = []
    async for u in db.users.find({"role": {"$ne": "admin"}}, {"_id": 0, "password_hash": 0}).sort("created_at", -1):
        members.append(u)
    return {"members": members, "count_active": await _active_member_count()}


@api.post("/admin/monthly-summary")
async def admin_monthly_summary(body: MonthlySummaryIn, user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    doc = {
        "id": str(uuid.uuid4()),
        "matters": body.matters,
        "ignore": body.ignore,
        "one_resource": body.one_resource,
        "sent": False,
        "send_at": now_iso() if body.send_now else now_iso(),
        "created_at": now_iso(),
    }
    await db.monthly_summaries.insert_one(doc)
    if body.send_now:
        await scheduler._send_summary(doc)
        await db.monthly_summaries.update_one({"id": doc["id"]}, {"$set": {"sent": True, "sent_at": now_iso()}})
        doc["sent"] = True
        doc["sent_at"] = now_iso()
    doc.pop("_id", None)
    return {"summary": doc}


@api.get("/admin/monthly-summary")
async def admin_list_summaries(user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    rows = await db.monthly_summaries.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"summaries": rows}


@api.get("/admin/reminders")
async def admin_reminders(user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    items = await db.reminders.find({}, {"_id": 0}).sort("when", 1).to_list(200)
    today = datetime.now(timezone.utc).date().isoformat()
    todays_post = await db.daily_post_log.find_one({"date": today})
    cadence = (await _get_setting("reminder_cadence")) or {"sales_posts_per_day": 2, "nurture_posts_per_day": 2}
    return {
        "items": items,
        "today": {
            "sales_posts_target": cadence.get("sales_posts_per_day", 2),
            "sales_posts_done": (todays_post or {}).get("sales", 0),
            "nurture_posts_target": cadence.get("nurture_posts_per_day", 2),
            "nurture_posts_done": (todays_post or {}).get("nurture", 0),
        },
    }


@api.post("/admin/reminders/log-post")
async def admin_log_post(body: dict, user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    today = datetime.now(timezone.utc).date().isoformat()
    kind = body.get("kind", "sales")
    field = "sales" if kind == "sales" else "nurture"
    await db.daily_post_log.update_one(
        {"date": today},
        {"$inc": {field: 1}, "$setOnInsert": {"date": today}},
        upsert=True,
    )
    log_entry = await db.daily_post_log.find_one({"date": today}, {"_id": 0})
    return {"log": log_entry}


@api.post("/admin/reminders")
async def admin_add_reminder(body: ReminderIn, user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    doc = {"id": str(uuid.uuid4()), "title": body.title, "when": body.when, "completed": False, "created_at": now_iso()}
    await db.reminders.insert_one(doc)
    doc.pop("_id", None)
    return {"item": doc}


@api.patch("/admin/reminders/{rid}")
async def admin_toggle_reminder(rid: str, body: dict, user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    await db.reminders.update_one({"id": rid}, {"$set": {"completed": bool(body.get("completed"))}})
    return {"status": "ok"}


@api.get("/admin/outbox")
async def admin_outbox(user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    rows = await db.emails_outbox.find({}, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    return {"emails": rows}


@api.post("/admin/manifesto")
async def admin_save_manifesto(body: ManifestoIn, user: dict = Depends(get_current_user)):
    await require_admin(user)
    await _set_setting("manifesto", {"body_md": body.body_md})
    return {"status": "ok"}


@api.post("/admin/community-rules")
async def admin_save_rules(body: ManifestoIn, user: dict = Depends(get_current_user)):
    await require_admin(user)
    await _set_setting("community_rules", {"body_md": body.body_md})
    return {"status": "ok"}


@api.post("/admin/quizzes")
async def admin_create_quiz(body: QuizIn, user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    qid = str(uuid.uuid4())
    await db.quizzes.insert_one({
        "id": qid, "drop_id": body.drop_id, "title": body.title,
        "questions": [q.model_dump() for q in body.questions], "created_at": now_iso(),
    })
    return {"id": qid}


@api.post("/admin/learning-paths")
async def admin_create_path(body: LearningPathIn, user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    pid = str(uuid.uuid4())
    await db.learning_paths.insert_one({
        "id": pid, "title": body.title, "description": body.description or "",
        "ordered_drop_ids": body.ordered_drop_ids, "created_at": now_iso(),
    })
    return {"id": pid}


@api.post("/admin/regenerate-pdf")
async def admin_regenerate_pdf(user: dict = Depends(get_current_user)):
    await require_admin(user)
    path = pdf_service.ensure_pdf(force=True)
    return {"path": path}


@api.post("/admin/trigger-winback")
async def admin_trigger_winback(user: dict = Depends(get_current_user)):
    await require_admin(user)
    await scheduler._winback_inactive()
    return {"status": "triggered"}


@api.post("/admin/trigger-drops")
async def admin_trigger_drops(user: dict = Depends(get_current_user)):
    await require_admin(user)
    await scheduler._publish_due_drops()
    return {"status": "triggered"}


@api.get("/admin/waitlist")
async def admin_waitlist(user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    rows = await db.waitlist.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"waitlist": rows, "count": len(rows)}


# ============================================================
#  ARTICLES / BLOG  (free + vault)
# ============================================================

import re as _re


def _slugify(s: str) -> str:
    s = (s or "").lower().strip()
    s = _re.sub(r"[^a-z0-9\s-]", "", s)
    s = _re.sub(r"\s+", "-", s)
    s = _re.sub(r"-+", "-", s)
    return s[:80].strip("-") or uuid.uuid4().hex[:8]


def _article_visible(a: dict, user: Optional[dict]) -> bool:
    if not a.get("published"):
        return False
    if not a.get("vault"):
        return True
    if not user:
        return False
    return user.get("role") == "admin" or user.get("tier") in ("full", "foundational")


@api.get("/public/articles")
async def public_articles(tag: Optional[str] = None, limit: int = 50):
    db = get_db()
    q = {"published": True, "vault": False}
    if tag:
        q["tags"] = tag
    rows = await db.articles.find(q, {"_id": 0, "body_md": 0}).sort("published_at", -1).limit(limit).to_list(limit)
    # vault peek (just titles + excerpts) for marketing on the public blog page
    vault_peek = await db.articles.find(
        {"published": True, "vault": True},
        {"_id": 0, "body_md": 0, "sales_copy_md": 0},
    ).sort("published_at", -1).limit(6).to_list(6)
    return {"articles": rows, "vault_peek": vault_peek}


@api.get("/public/articles/{slug}")
async def public_article(slug: str):
    db = get_db()
    a = await db.articles.find_one({"slug": slug, "published": True, "vault": False}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Article not found")
    await db.articles.update_one({"slug": slug}, {"$inc": {"views": 1}})
    return {"article": a}


@api.get("/vault/articles")
async def vault_articles(user: dict = Depends(get_current_user)):
    if not _is_member_or_admin(user):
        raise HTTPException(403, "Sovereign or Foundational tier required")
    db = get_db()
    rows = await db.articles.find({"published": True, "vault": True}, {"_id": 0, "body_md": 0}).sort("published_at", -1).to_list(500)
    return {"articles": rows}


@api.get("/vault/articles/{slug}")
async def vault_article(slug: str, user: dict = Depends(get_current_user)):
    db = get_db()
    a = await db.articles.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Article not found")
    if a.get("vault") and not _is_member_or_admin(user):
        raise HTTPException(403, "Vault content requires an active membership")
    await db.articles.update_one({"slug": slug}, {"$inc": {"views": 1}})
    return {"article": a}


@api.post("/public/lead")
async def capture_lead(body: LeadIn):
    db = get_db()
    email = body.email.lower()
    existing = await db.leads.find_one({"email": email})
    if not existing:
        await db.leads.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "name": body.name or "",
            "source": body.source or "blog",
            "created_at": now_iso(),
        })
    # Fire opt-in welcome email
    try:
        import email_templates
        subj, html = email_templates.render("lead_optin", {"frontend": os.environ.get("FRONTEND_BASE_URL", "")})
        await email_service.send_email(email, subj, html, kind="lead_optin")
    except Exception:
        pass
    return {"status": "ok"}


@api.post("/admin/articles")
async def admin_create_article(body: ArticleIn, user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    slug = _slugify(body.slug or body.title)
    # ensure unique slug
    base = slug; i = 1
    while await db.articles.find_one({"slug": slug}):
        i += 1
        slug = f"{base}-{i}"
    published = False
    published_at = None
    if not body.scheduled_for:
        published = True
        published_at = now_iso()
    doc = {
        "id": str(uuid.uuid4()),
        "slug": slug,
        "title": body.title,
        "subtitle": body.subtitle or "",
        "excerpt": body.excerpt or "",
        "body_md": body.body_md,
        "cover_image_url": body.cover_image_url or "",
        "tags": body.tags,
        "seo_title": body.seo_title or body.title,
        "seo_description": body.seo_description or body.excerpt or "",
        "og_image_url": body.og_image_url or body.cover_image_url or "",
        "vault": bool(body.vault),
        "scheduled_for": body.scheduled_for,
        "sales_copy_md": body.sales_copy_md or "",
        "optin_headline": body.optin_headline or "",
        "optin_cta": body.optin_cta or "",
        "published": published,
        "published_at": published_at,
        "views": 0,
        "created_at": now_iso(),
        "created_by": user["id"],
        "author_name": user.get("name", "Robin Angel"),
        "author_avatar": user.get("avatar_url", ""),
    }
    await db.articles.insert_one(doc)
    doc.pop("_id", None)
    return {"article": doc}


@api.patch("/admin/articles/{article_id}")
async def admin_update_article(article_id: str, body: ArticleUpdate, user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    update = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if "slug" in update and update["slug"]:
        update["slug"] = _slugify(update["slug"])
    if update.get("published") is True:
        update["published_at"] = now_iso()
    await db.articles.update_one({"id": article_id}, {"$set": update})
    a = await db.articles.find_one({"id": article_id}, {"_id": 0})
    return {"article": a}


@api.delete("/admin/articles/{article_id}")
async def admin_delete_article(article_id: str, user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    await db.articles.delete_one({"id": article_id})
    return {"status": "ok"}


@api.get("/admin/articles")
async def admin_list_articles(user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    rows = await db.articles.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"articles": rows}


@api.get("/admin/leads")
async def admin_leads(user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    rows = await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return {"leads": rows, "count": len(rows)}


# ============================================================
#  PROFILES (avatar, cover, bio, setup wizard)
# ============================================================

@api.patch("/me/profile")
async def update_my_profile(body: ProfileIn, user: dict = Depends(get_current_user)):
    db = get_db()
    update = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"user": u}


@api.get("/users/{user_id}/public")
async def public_user_profile(user_id: str, viewer: dict = Depends(get_current_user)):
    if not _is_member_or_admin(viewer):
        raise HTTPException(403, "Members only")
    db = get_db()
    u = await db.users.find_one({"id": user_id}, {
        "_id": 0, "id": 1, "name": 1, "bio": 1, "avatar_url": 1,
        "cover_image_url": 1, "pronouns": 1, "location": 1, "website": 1,
        "tier": 1, "role": 1, "created_at": 1,
    })
    if not u:
        raise HTTPException(404, "Not found")
    posts = await db.posts.find({"user_id": user_id, "deleted": {"$ne": True}}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    return {"user": u, "posts": posts}


# ============================================================
#  EMAIL TEMPLATES (admin preview + override)
# ============================================================

@api.get("/admin/email-templates")
async def admin_email_templates(user: dict = Depends(get_current_user)):
    await require_admin(user)
    import email_templates as et
    db = get_db()
    overrides = {}
    async for o in db.email_template_overrides.find({}, {"_id": 0}):
        overrides[o["key"]] = o
    out = []
    fe = os.environ.get("FRONTEND_BASE_URL", "")
    for key, meta in et.TEMPLATES.items():
        sample_ctx = {"frontend": fe, "name": "Sovereign", "topic": "your last drop",
                      "title": "Sample title", "preview": "Sample preview",
                      "excerpt": "Sample excerpt", "slug": "sample", "vault": False,
                      "matters": ["A", "B", "C"], "ignore": ["X", "Y"],
                      "one_resource": "The one resource",
                      "amount": "$22.00", "referred": "a new sovereign"}
        try:
            subj, html = meta["fn"](sample_ctx)
        except Exception as e:
            subj, html = "(render error)", str(e)
        out.append({
            "key": key,
            "label": meta["label"],
            "trigger": meta["trigger"],
            "variables": meta["variables"],
            "preview_subject": subj,
            "preview_html": html,
            "override": overrides.get(key),
        })
    return {"templates": out}


@api.patch("/admin/email-templates/{key}")
async def admin_email_template_update(key: str, body: EmailTemplateUpdate, user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    update = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    if update:
        await db.email_template_overrides.update_one(
            {"key": key},
            {"$set": {**update, "key": key, "updated_at": now_iso()}},
            upsert=True,
        )
    o = await db.email_template_overrides.find_one({"key": key}, {"_id": 0})
    return {"override": o}


@api.post("/admin/email-templates/{key}/send-test")
async def admin_send_test_email(key: str, user: dict = Depends(get_current_user)):
    await require_admin(user)
    import email_templates as et
    fe = os.environ.get("FRONTEND_BASE_URL", "")
    ctx = {"frontend": fe, "name": user.get("name", "Robin"),
           "topic": "your last drop", "title": "Sample title",
           "preview": "Sample preview", "excerpt": "Sample excerpt",
           "slug": "sample", "vault": False,
           "matters": ["A", "B", "C"], "ignore": ["X"],
           "one_resource": "The one resource",
           "amount": "$22.00", "referred": "a new sovereign"}
    subj, html = et.render(key, ctx)
    rec = await email_service.send_email(user["email"], "[TEST] " + subj, html, kind=f"test_{key}")
    return {"status": rec.get("status"), "id": rec.get("id")}


# ============================================================
#  ADMIN STATS (dashboard tiles)
# ============================================================

@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(get_current_user)):
    await require_admin(user)
    db = get_db()
    return {
        "members_active": await db.users.count_documents({"tier": {"$in": ["full", "foundational"]}}),
        "members_full": await db.users.count_documents({"tier": "full"}),
        "members_foundational": await db.users.count_documents({"tier": "foundational"}),
        "members_canceled": await db.users.count_documents({"tier": "canceled"}),
        "drops": await db.drops.count_documents({}),
        "drops_published": await db.drops.count_documents({"published": True}),
        "articles": await db.articles.count_documents({}),
        "articles_published": await db.articles.count_documents({"published": True}),
        "vault_articles": await db.articles.count_documents({"vault": True, "published": True}),
        "leads": await db.leads.count_documents({}),
        "waitlist": await db.waitlist.count_documents({}),
        "emails_sent": await db.emails_outbox.count_documents({"status": "sent"}),
        "emails_queued": await db.emails_outbox.count_documents({"status": {"$in": ["queued", "queued_no_key"]}}),
    }


# ---------- mount and CORS ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
