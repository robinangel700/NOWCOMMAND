"""Pre-written email templates. Variables interpolated at send time.

Each template returns (subject, html_body). Keep them ready-to-fire so a single
trigger lands a polished email in the recipient's inbox.
"""
from typing import Dict, Tuple, Callable
from services.email_service import wrap_html

# In-memory cache of admin overrides {key: {subject_override, html_override}}.
# Loaded at startup and refreshed whenever the admin edits a template, so that
# every trigger (onboarding, drops, win-back, etc.) sends the admin's version.
_OVERRIDES: Dict[str, Dict] = {}


class _SafeDict(dict):
    def __missing__(self, k):
        return "{" + k + "}"


def _fmt(s: str, ctx: Dict) -> str:
    try:
        return s.format_map(_SafeDict(ctx))
    except Exception:
        return s


def set_override(key: str, data: Dict):
    if data:
        _OVERRIDES[key] = data
    else:
        _OVERRIDES.pop(key, None)


def load_overrides(items):
    _OVERRIDES.clear()
    for it in items or []:
        k = it.get("key")
        if k:
            _OVERRIDES[k] = it


def _onboarding(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    name = (ctx.get("name") or "Sovereign").split(" ")[0]
    return (
        "Welcome to NOWCOMMAND — your Activation Codes are inside",
        wrap_html(
            f"You crossed the threshold, {name}.",
            "<p>Your seat in NOWCOMMAND is active. <strong>The Mammon Breaker Activation Codes</strong> is attached to this email and also waiting in your dashboard.</p>"
            "<p><strong>What to do in the next 24 hours:</strong></p>"
            "<ol style='line-height:1.9'>"
            "<li>Download and read the Activation Codes once tonight.</li>"
            "<li>Open the Community Vault and read the One Page Manifesto.</li>"
            "<li>Set your profile (avatar, bio) so the community knows who just walked in.</li>"
            "<li>Post one sentence in the Weekly Biggest Win thread — even &lsquo;I showed up&rsquo; counts.</li>"
            "<li>Saturday's drop is already scheduled. Watch the dashboard.</li>"
            "</ol>"
            "<p style='margin-top:24px'>You are not subscribing. You are crossing a threshold.</p>",
            cta_url=f"{fe}/dashboard?wizard=1",
            cta_label="Begin the 60-second setup",
        ),
    )


def _winback(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    topic = ctx.get("topic", "your dominion work")
    return (
        "I noticed you stepped away — a 2-minute shortcut",
        wrap_html(
            "I noticed you stepped away",
            f"<p>I saw you were working on <strong>{topic}</strong> recently.</p>"
            "<p>Here is a 2-minute shortcut to break the next bottleneck: come back, open the dashboard, "
            "and write one sentence in the Weekly Win thread. That single act re-anchors the codes.</p>"
            "<p>Don't let Chronos eat your momentum. Kairos is still holding the door.</p>",
            cta_url=f"{fe}/dashboard",
            cta_label="Re-enter NOWCOMMAND",
        ),
    )


def _payment_failed(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    return (
        "Payment hiccup — NOWCOMMAND auto-retry scheduled",
        wrap_html(
            "A small detour, no breach.",
            "<p>Your last NOWCOMMAND payment didn't go through. Stripe will retry automatically over the next several days.</p>"
            "<p>One click below updates your card in 10 seconds. Your seat is safe.</p>",
            cta_url=f"{fe}/billing",
            cta_label="Update card",
        ),
    )


def _invoice_upcoming(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    return (
        "NOWCOMMAND renewal preview",
        wrap_html(
            "Your seat is renewing",
            "<p>Your NOWCOMMAND membership will renew shortly. If your card has changed or expires soon, one click below updates it.</p>"
            "<p>No action needed if everything's current.</p>",
            cta_url=f"{fe}/billing",
            cta_label="Manage Billing",
        ),
    )


def _reengagement_step2(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    return (
        "Re-engage with NOWCOMMAND — your seat is still waiting",
        wrap_html(
            "Your membership is waiting",
            "<p>You’ve been away, but your seat is still active. Now is a strong moment to return before the next signal fades.</p>"
            "<p>Open the dashboard and refresh the momentum with one small action.</p>",
            cta_url=f"{fe}/dashboard",
            cta_label="Return to the dashboard",
        ),
    )


def _reengagement_step3(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    return (
        "Final re-engagement — your NOWCOMMAND seat is still on hold",
        wrap_html(
            "This is the last nudge",
            "<p>Your membership remains available, but the window is narrowing. One small re-entry now keeps the codes alive.</p>"
            "<p>Open the dashboard to continue where you left off.</p>",
            cta_url=f"{fe}/dashboard",
            cta_label="Re-enter NOWCOMMAND",
        ),
    )


def _payment_succeeded(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    return (
        "NOWCOMMAND renewal complete",
        wrap_html(
            "Your seat is secure.",
            "<p>Your payment went through successfully. The membership continues without interruption.</p>"
            "<p>If you want to update your card or review your plan, use the billing page below.</p>",
            cta_url=f"{fe}/billing",
            cta_label="Manage Billing",
        ),
    )


def _subscription_paused(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    return (
        "NOWCOMMAND membership paused",
        wrap_html(
            "Your membership is paused",
            "<p>Your NOWCOMMAND subscription has been paused. You can resume access at any time from your billing page.</p>",
            cta_url=f"{fe}/billing",
            cta_label="Resume membership",
        ),
    )


def _subscription_resumed(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    return (
        "NOWCOMMAND membership resumed",
        wrap_html(
            "Your membership is active again.",
            "<p>Your NOWCOMMAND subscription has resumed and the codes are waiting for you inside the dashboard.</p>"
            "<p>Open the dashboard to continue where you left off.</p>",
            cta_url=f"{fe}/dashboard",
            cta_label="Open Dashboard",
        ),
    )


def _drop_published(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    title = ctx.get("title", "A new transmission")
    preview = ctx.get("preview", "A new transmission just landed in your NOWCOMMAND dashboard.")
    return (
        f"NEW DROP: {title}",
        wrap_html(
            title,
            f"<p>{preview}</p>",
            cta_url=f"{fe}/dashboard",
            cta_label="Open Dashboard",
        ),
    )


def _article_published(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    title = ctx.get("title", "New article")
    excerpt = ctx.get("excerpt", "")
    slug = ctx.get("slug", "")
    vault = ctx.get("vault", False)
    return (
        ("VAULT: " if vault else "") + title,
        wrap_html(
            title,
            f"<p>{excerpt}</p>",
            cta_url=f"{fe}/{'vault' if vault else 'blog'}/{slug}",
            cta_label="Read now",
        ),
    )


def _vault_teaser(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    title = ctx.get("title", "A new vault transmission")
    return (
        f"VAULT TEASER: {title}",
        wrap_html(
            "A vault piece just dropped",
            f"<p>A new members-only article landed in the Vault: <strong>{title}</strong>.</p>"
            "<p>Vault entries are reserved for sovereigns. The free blog gives you the doorway. The Vault gives you the territory.</p>",
            cta_url=f"{fe}/pricing",
            cta_label="Claim a seat to read",
        ),
    )


def _monthly_summary(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    matters = "".join(f"<li>{m}</li>" for m in ctx.get("matters", []))
    ignore = "".join(f"<li>{i}</li>" for i in ctx.get("ignore", []))
    return (
        "NOWCOMMAND — Executive Summary",
        wrap_html(
            "Monthly Executive Summary",
            f"<h3 style='color:#D4AF37;font-family:Cormorant Garamond,serif'>What matters right now</h3><ul>{matters}</ul>"
            f"<h3 style='color:#D4AF37;font-family:Cormorant Garamond,serif'>What to ignore</h3><ul>{ignore}</ul>"
            f"<h3 style='color:#D4AF37;font-family:Cormorant Garamond,serif'>The one resource you need</h3>"
            f"<p>{ctx.get('one_resource','')}</p>",
            cta_url=f"{fe}/dashboard",
            cta_label="Open Dashboard",
        ),
    )


def _waitlist(ctx: Dict) -> Tuple[str, str]:
    return (
        "You're on the NOWCOMMAND waitlist",
        wrap_html(
            "You're on the list",
            "<p>The vault holds 300 seats. When one opens, you'll be the first to know.</p>"
            "<p>Hold your posture. The codes are still moving.</p>",
        ),
    )


def _lead_optin(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    fb = ctx.get("fb_group", "https://www.facebook.com/groups/authorityovermammonandchronos")
    return (
        "Welcome to the NOWCOMMAND list — your first transmission",
        wrap_html(
            "Welcome to the list",
            "<p>You just put your name on the wall. Here's what happens next, in order:</p>"
            "<p><strong>1.</strong> Every Tuesday I send one short, sharp piece on money, time & divine timing. Read it. Apply one line. Watch what shifts.</p>"
            f"<p><strong>2.</strong> Join the free Facebook group — that's where the daily heat is. Daily transmissions, real-time wins, and stewards in motion: "
            f"<a href='{fb}' style='color:#D4AF37'>Authority Over Mammon &amp; Chronos →</a></p>"
            "<p><strong>3.</strong> When you're ready to actually <em>operate</em> from these codes (not just consume them), the membership is the door. Founder pricing closes when the seats fill — and they will.</p>"
            "<blockquote style='border-left:3px solid #D4AF37;padding-left:16px;color:#A39F98;margin:24px 0'>"
            "The Tuesday transmission is the <em>doorway</em>. The Facebook group is the <em>street outside</em>. The membership is the <em>house</em>. "
            "If you've been circling money breakthrough for years and watching others walk in — the difference isn't intelligence. It's enrollment.</blockquote>"
            "<p>Read the next email when it lands. Join the group tonight. Decide on the house when Kairos says so.</p>",
            cta_url=f"{fe}/pricing",
            cta_label="See the membership",
        ),
    )


def _affiliate_payout(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    amount = ctx.get("amount", "$22.00")
    referred = ctx.get("referred", "a new sovereign")
    return (
        "Affiliate credit — you just earned " + amount,
        wrap_html(
            "A new sovereign came through you",
            f"<p>{referred} just crossed the threshold using your link. You earned <strong>{amount}</strong> — 50% share, credited to your account.</p>",
            cta_url=f"{fe}/affiliate",
            cta_label="See your affiliate dashboard",
        ),
    )


def _alacarte_purchased(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    title = ctx.get("title", "Your asset")
    return (
        f"Unlocked: {title}",
        wrap_html(
            f"You unlocked {title}",
            "<p>The asset is now in your dashboard. Open it whenever you're ready.</p>",
            cta_url=f"{fe}/dashboard",
            cta_label="Open it",
        ),
    )


def _cancel_confirmation(ctx: Dict) -> Tuple[str, str]:
    fe = ctx.get("frontend", "")
    return (
        "Your NOWCOMMAND seat has been released",
        wrap_html(
            "You stepped out of the realm",
            "<p>Your subscription is canceled. Your notes, bookmarks, downloads, and community access have been removed per the terms you agreed to.</p>"
            "<p>The door isn't locked. If the season ever changes, the threshold is still where you left it.</p>",
            cta_url=f"{fe}/pricing",
            cta_label="If you return",
        ),
    )


TEMPLATES: Dict[str, Dict] = {
    "onboarding": {
        "label": "Onboarding (purchase complete)",
        "trigger": "Sent automatically when payment_status=paid on a subscription checkout.",
        "fn": _onboarding,
        "variables": ["name", "frontend"],
    },
    "winback": {
        "label": "Win-back (14 days inactive)",
        "trigger": "Sent by scheduler when a member hasn't logged in for 14+ days (max once per 7 days).",
        "fn": _winback,
        "variables": ["topic", "frontend"],
    },
    "payment_failed": {
        "label": "Payment failed",
        "trigger": "Stripe webhook 'invoice.payment_failed'.",
        "fn": _payment_failed,
        "variables": ["frontend"],
    },
    "payment_succeeded": {
        "label": "Renewal success",
        "trigger": "Stripe webhook 'invoice.payment_succeeded'.",
        "fn": _payment_succeeded,
        "variables": ["frontend"],
    },
    "subscription_paused": {
        "label": "Subscription paused",
        "trigger": "Stripe webhook 'customer.subscription.paused'.",
        "fn": _subscription_paused,
        "variables": ["frontend"],
    },
    "subscription_resumed": {
        "label": "Subscription resumed",
        "trigger": "Stripe webhook 'customer.subscription.resumed'.",
        "fn": _subscription_resumed,
        "variables": ["frontend"],
    },
    "reengagement_step2": {
        "label": "Re-engagement sequence: step 2",
        "trigger": "Automated re-engagement sequence for inactive members.",
        "fn": _reengagement_step2,
        "variables": ["frontend"],
    },
    "reengagement_step3": {
        "label": "Re-engagement sequence: step 3",
        "trigger": "Automated re-engagement sequence for inactive members.",
        "fn": _reengagement_step3,
        "variables": ["frontend"],
    },
    "subscription_resumed": {
        "label": "Subscription resumed",
        "trigger": "Stripe webhook 'customer.subscription.resumed'.",
        "fn": _subscription_resumed,
        "variables": ["frontend"],
    },
    "invoice_upcoming": {
        "label": "Renewal heads-up / card expiration",
        "trigger": "Stripe webhook 'invoice.upcoming'.",
        "fn": _invoice_upcoming,
        "variables": ["frontend"],
    },
    "drop_published": {
        "label": "New drop landed",
        "trigger": "Sent to every active member when a drop is auto-published by the scheduler.",
        "fn": _drop_published,
        "variables": ["title", "preview", "frontend"],
    },
    "article_published": {
        "label": "New blog article",
        "trigger": "Sent when an article is published (free → to leads + members, vault → to members).",
        "fn": _article_published,
        "variables": ["title", "excerpt", "slug", "vault", "frontend"],
    },
    "vault_teaser": {
        "label": "Vault teaser (to leads)",
        "trigger": "Optional broadcast to free leads when a vault article publishes.",
        "fn": _vault_teaser,
        "variables": ["title", "frontend"],
    },
    "monthly_summary": {
        "label": "Monthly executive summary",
        "trigger": "Sent when admin presses 'Send to all members' in the Summary tab.",
        "fn": _monthly_summary,
        "variables": ["matters", "ignore", "one_resource", "frontend"],
    },
    "waitlist": {
        "label": "Waitlist joined",
        "trigger": "Sent when a seeker joins the waitlist (doors closed at 300).",
        "fn": _waitlist,
        "variables": [],
    },
    "lead_optin": {
        "label": "Blog opt-in confirmation",
        "trigger": "Sent when someone subscribes via the blog opt-in form.",
        "fn": _lead_optin,
        "variables": ["frontend"],
    },
    "affiliate_payout": {
        "label": "Affiliate payout credited",
        "trigger": "Sent to the affiliate when a referral converts.",
        "fn": _affiliate_payout,
        "variables": ["amount", "referred", "frontend"],
    },
    "alacarte_purchased": {
        "label": "A-la-carte unlocked",
        "trigger": "Sent when a one-time asset purchase completes.",
        "fn": _alacarte_purchased,
        "variables": ["title", "frontend"],
    },
    "cancel_confirmation": {
        "label": "Cancellation confirmation",
        "trigger": "Sent when a member completes cancel flow.",
        "fn": _cancel_confirmation,
        "variables": ["frontend"],
    },
}


def render(key: str, ctx: Dict) -> Tuple[str, str]:
    tpl = TEMPLATES.get(key)
    if not tpl:
        raise KeyError(f"Unknown email template: {key}")
    subj, html = tpl["fn"](ctx)
    ov = _OVERRIDES.get(key)
    if ov:
        if ov.get("subject_override"):
            subj = _fmt(ov["subject_override"], ctx)
        if ov.get("html_override"):
            # Admin writes the body content (HTML allowed); we wrap it in the
            # branded shell so it always looks polished.
            html = wrap_html(subj, _fmt(ov["html_override"], ctx))
    return subj, html
