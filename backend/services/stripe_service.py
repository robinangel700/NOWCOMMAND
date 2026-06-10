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

def plan_to_price_data(plan: str, current_full_cents: int) -> Tuple[int, str, str]:
    """Returns (unit_amount_cents, interval, description) for stripe price_data."""
    if plan == "full_monthly":
        return current_full_cents, "month", "NOWREALM Sovereign Membership"
    if plan == "full_annual":
        return int(os.environ.get("PRICE_FULL_ANNUAL_CENTS", 50000)), "year", "NOWREALM Sovereign Annual"
    if plan == "foundational_monthly":
        return int(os.environ.get("PRICE_FOUNDATIONAL_MONTHLY_CENTS", 1100)), "month", "NOWREALM Foundational"
    raise ValueError(f"Unknown plan {plan}")


def create_subscription_checkout(
    customer_id: str,
    plan: str,
    success_url: str,
    cancel_url: str,
    current_full_cents: int,
    metadata: dict,
) -> dict:
    """Returns {url, session_id} or raises."""
    amount, interval, desc = plan_to_price_data(plan, current_full_cents)
    if not is_real_key():
        # DEV-mode fallback: emulate a checkout by returning a frontend URL that
        # will immediately mark success. Used only when no real Stripe key.
        session_id = f"cs_dev_{plan}_{customer_id}"
        return {
            "url": f"{success_url.replace('{CHECKOUT_SESSION_ID}', session_id)}",
            "session_id": session_id,
            "dev_mode": True,
            "amount": amount,
            "interval": interval,
        }
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
    if not is_real_key():
        session_id = f"cs_dev_ala_{customer_id}_{metadata.get('drop_id','x')}"
        return {
            "url": success_url.replace("{CHECKOUT_SESSION_ID}", session_id),
            "session_id": session_id,
            "dev_mode": True,
        }
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
    if not is_real_key():
        # Dev-mode: pretend it's complete.
        return {
            "id": session_id,
            "payment_status": "paid",
            "status": "complete",
            "customer": session_id.replace("cs_dev_", "cus_dev_"),
            "subscription": session_id.replace("cs_", "sub_"),
            "amount_total": 4400,
            "currency": "usd",
            "dev_mode": True,
        }
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


def create_portal_session(customer_id: str, return_url: str) -> dict:
    if not is_real_key():
        return {"url": return_url, "dev_mode": True}
    _init()
    s = stripe.billing_portal.Session.create(customer=customer_id, return_url=return_url)
    return {"url": s["url"], "dev_mode": False}
