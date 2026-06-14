"""Stripe subscriptions + a-la-carte using stripe SDK directly.

We bypass emergentintegrations for subscriptions because that lib targets
one-time checkout. Subscriptions require mode='subscription' with recurring
price objects (created on the fly via price_data).

STRIPE_API_KEY must be set in env. We use the test key 'sk_test_emergent' per
the integration playbook -- in this sandboxed environment, all Stripe calls
will fail unless a real test key is provided. We catch errors gracefully and
return a clear status so the frontend can surface them. For local/dev sandbox
without a real key we also expose a fallback dev-mode that simulates a
successful subscription so the day-1 flow can be exercised end-to-end.
"""
import os
import logging
from typing import Optional, Tuple
import stripe

log = logging.getLogger("stripe")


def _api_key() -> str:
    return os.environ.get("STRIPE_API_KEY", "")


def is_real_key() -> bool:
    k = _api_key()
    return bool(k) and k != "sk_test_emergent" and (k.startswith("sk_test_") or k.startswith("sk_live_"))


def require_real_key():
    if not is_real_key():
        raise RuntimeError("Stripe is not configured with a real API key.")


def construct_event(payload: bytes, sig_header: str, webhook_secret: str) -> dict:
    _init()
    return stripe.Webhook.construct_event(payload, sig_header, webhook_secret)


def _init():
    stripe.api_key = _api_key()


def create_or_get_customer(email: str, name: Optional[str], existing_id: Optional[str]) -> Optional[str]:
    if not is_real_key():
        return existing_id or f"cus_dev_{email.replace('@','_at_')}"
    _init()
    if existing_id:
        try:
            stripe.Customer.retrieve(existing_id)
            return existing_id
        except Exception:
            pass
    c = stripe.Customer.create(email=email, name=name or email)
    return c["id"]


# Price helpers -------------------------------------------------------------

def plan_to_price_data(plan: str, pricing: dict) -> Tuple[int, str, str]:
    """Returns (unit_amount_cents, interval, description) for stripe price_data.

    `pricing` is the resolved pricing dict (admin overrides + env fallback)
    so that price changes in the Admin panel flow straight into new Stripe
    checkouts. current_full = pricing['full_monthly_cents'].
    """
    if plan == "full_monthly":
        return int(pricing["full_monthly_cents"]), "month", "NOWCOMMAND Sovereign Membership"
    if plan == "full_annual":
        return int(pricing["full_annual_cents"]), "year", "NOWCOMMAND Sovereign Annual"
    if plan == "foundational_monthly":
        return int(pricing["foundational_monthly_cents"]), "month", "NOWCOMMAND Foundational"
    raise ValueError(f"Unknown plan {plan}")


def create_subscription_checkout(
    customer_id: str,
    plan: str,
    success_url: str,
    cancel_url: str,
    pricing: dict,
    metadata: dict,
) -> dict:
    """Returns {url, session_id} or raises."""
    amount, interval, desc = plan_to_price_data(plan, pricing)
    require_real_key()
    _init()
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {"name": desc},
                "unit_amount": amount,
                "recurring": {"interval": interval},
            },
            "quantity": 1,
        }],
        success_url=success_url,
        cancel_url=cancel_url,
        subscription_data={"metadata": metadata},
        metadata=metadata,
        payment_method_collection="always",
        allow_promotion_codes=True,
    )
    return {"url": session["url"], "session_id": session["id"], "dev_mode": False, "amount": amount, "interval": interval}


def create_alacarte_checkout(
    customer_id: str,
    amount_cents: int,
    description: str,
    success_url: str,
    cancel_url: str,
    metadata: dict,
) -> dict:
    require_real_key()
    _init()
    session = stripe.checkout.Session.create(
        mode="payment",
        customer=customer_id,
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {"name": description},
                "unit_amount": amount_cents,
            },
            "quantity": 1,
        }],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    return {"url": session["url"], "session_id": session["id"], "dev_mode": False}


def retrieve_session(session_id: str) -> dict:
    require_real_key()
    _init()
    s = stripe.checkout.Session.retrieve(session_id, expand=["subscription", "customer"])
    return s.to_dict_recursive() if hasattr(s, "to_dict_recursive") else dict(s)


def pause_subscription(subscription_id: str) -> dict:
    if not is_real_key():
        return {"id": subscription_id, "status": "paused", "dev_mode": True}
    _init()
    s = stripe.Subscription.modify(subscription_id, pause_collection={"behavior": "void"})
    return dict(s)


def resume_subscription(subscription_id: str) -> dict:
    if not is_real_key():
        return {"id": subscription_id, "status": "active", "dev_mode": True}
    _init()
    s = stripe.Subscription.modify(subscription_id, pause_collection="")
    return dict(s)


def cancel_subscription(subscription_id: str) -> dict:
    if not is_real_key():
        return {"id": subscription_id, "status": "canceled", "dev_mode": True}
    _init()
    s = stripe.Subscription.delete(subscription_id)
    return dict(s)


def update_subscription_price(subscription_id: str, new_amount_cents: int, interval: str, description: str) -> dict:
    if not is_real_key():
        return {"id": subscription_id, "status": "active", "amount": new_amount_cents, "dev_mode": True}
    _init()
    sub = stripe.Subscription.retrieve(subscription_id)
    item_id = sub["items"]["data"][0]["id"]
    s = stripe.Subscription.modify(
        subscription_id,
        items=[{
            "id": item_id,
            "price_data": {
                "currency": "usd",
                "product_data": {"name": description},
                "unit_amount": new_amount_cents,
                "recurring": {"interval": interval},
            },
        }],
        proration_behavior="create_prorations",
    )
    return dict(s)


def sync_catalog(pricing: dict) -> dict:
    """Push the current pricing to Stripe as a Product + recurring Prices.

    Checkout already uses inline price_data (so new checkouts always reflect the
    latest Admin price), but this also materializes durable Product/Price objects
    in the Stripe catalog so the creator can see/manage them in the Stripe
    Dashboard. Existing subscribers keep their locked-in price (new signups only).

    Returns {synced, dev_mode, product_id, prices}.
    """
    if not is_real_key():
        return {"synced": False, "dev_mode": True, "reason": "no real Stripe key in this environment"}
    _init()
    try:
        # One canonical product for the membership.
        product = stripe.Product.create(
            name="NOWCOMMAND Membership",
            metadata={"app": "nowcommand"},
        ) if False else None
        # Find-or-create by a stable lookup via metadata is overkill; create fresh
        # Price objects each sync (Prices are immutable). We tag them so the latest
        # is identifiable. Reuse a product if one already exists.
        existing = stripe.Product.search(query="metadata['app']:'nowcommand'", limit=1)
        if existing and existing.data:
            product = existing.data[0]
        else:
            product = stripe.Product.create(name="NOWCOMMAND Membership", metadata={"app": "nowcommand"})
        prices = {}
        specs = [
            ("full_monthly", int(pricing["full_monthly_cents"]), "month"),
            ("full_annual", int(pricing["full_annual_cents"]), "year"),
            ("foundational_monthly", int(pricing["foundational_monthly_cents"]), "month"),
        ]
        for key, amount, interval in specs:
            p = stripe.Price.create(
                product=product["id"],
                currency="usd",
                unit_amount=amount,
                recurring={"interval": interval},
                metadata={"plan": key, "current": "true"},
                nickname=f"NOWCOMMAND {key}",
            )
            prices[key] = p["id"]
        return {"synced": True, "dev_mode": False, "product_id": product["id"], "prices": prices}
    except Exception as e:
        log.exception("sync_catalog failed")
        return {"synced": False, "dev_mode": False, "error": str(e)}


def create_portal_session(customer_id: str, return_url: str) -> dict:
    require_real_key()
    _init()
    s = stripe.billing_portal.Session.create(customer=customer_id, return_url=return_url)
    return {"url": s["url"], "dev_mode": False}


# ============================================================
#  STRIPE CONNECT — Affiliate Payout Accounts
# ============================================================

def create_connect_account(email: str, user_id: str) -> dict:
    """Create a Stripe Connect Express account for an affiliate.

    Returns {account_id, onboarding_url} or raises.
    For real Stripe, we include business_profile and tos_acceptance
    so the account is ready for KYC onboarding.
    """
    if not is_real_key():
        return {"account_id": f"acct_dev_{user_id[:8]}", "onboarding_url": None, "dev_mode": True}
    _init()
    try:
        account = stripe.Account.create(
            type="express",
            email=email,
            capabilities={
                "transfers": {"requested": True},
            },
            metadata={"user_id": user_id, "app": "nowcommand"},
            business_type="individual",
            business_profile={
                "mcc": 7299,  # Miscellaneous personal services (not a specific category)
                "url": os.environ.get("FRONTEND_BASE_URL", "").rstrip("/"),
                "product_description": "Affiliate partner for NOWCOMMAND membership platform",
            },
            tos_acceptance={
                "service_agreement": "recipient",
            },
        )
        # Generate an account onboarding link
        origin = os.environ.get("FRONTEND_BASE_URL", "").rstrip("/")
        link = stripe.AccountLink.create(
            account=account["id"],
            refresh_url=f"{origin}/stewardship?connect=refresh",
            return_url=f"{origin}/stewardship?connect=complete",
            type="account_onboarding",
        )
        return {"account_id": account["id"], "onboarding_url": link["url"], "dev_mode": False}
    except Exception as e:
        log.exception("Failed to create Connect account")
        raise RuntimeError(f"Stripe Connect account creation failed: {e}")


def retrieve_connect_account(account_id: str) -> dict:
    """Check the status of a Connect account (charges_enabled, payouts_enabled, details_submitted)."""
    if not is_real_key():
        return {"charges_enabled": False, "payouts_enabled": False, "details_submitted": False, "dev_mode": True}
    _init()
    try:
        acct = stripe.Account.retrieve(account_id)
        return {
            "charges_enabled": acct.get("charges_enabled", False),
            "payouts_enabled": acct.get("payouts_enabled", False),
            "details_submitted": acct.get("details_submitted", False),
            "requirements": acct.get("requirements", {}),
            "dev_mode": False,
        }
    except Exception as e:
        log.exception("Failed to retrieve Connect account")
        return {"error": str(e), "dev_mode": False}


def create_connect_transfer(amount_cents: int, destination_account_id: str, metadata: dict) -> dict:
    """Transfer funds from the platform to a connected account.

    The platform must have sufficient balance. Returns the transfer object.
    """
    require_real_key()
    _init()
    try:
        transfer = stripe.Transfer.create(
            amount=amount_cents,
            currency="usd",
            destination=destination_account_id,
            metadata=metadata,
        )
        return {"id": transfer["id"], "amount": transfer["amount"], "status": transfer.get("status"), "dev_mode": False}
    except Exception as e:
        log.exception("Failed to create Connect transfer")
        raise RuntimeError(f"Stripe Connect transfer failed: {e}")


def create_connect_login_link(account_id: str) -> dict:
    """Generate a login link for the affiliate to view their Express dashboard."""
    if not is_real_key():
        return {"url": None, "dev_mode": True}
    _init()
    try:
        link = stripe.Account.create_login_link(account_id)
        return {"url": link["url"], "dev_mode": False}
    except Exception as e:
        log.exception("Failed to create login link")
        return {"error": str(e), "dev_mode": False}
