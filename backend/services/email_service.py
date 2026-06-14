"""Email delivery via Resend, with DB outbox queue when key not set."""
import os
import uuid
from typing import Optional
import logging
from db import get_db, now_iso

log = logging.getLogger("email")


async def _email_config() -> dict:
    """Resolve the From address + reply-to. Admin settings override env."""
    db = get_db()
    s = await db.settings.find_one({"key": "email_settings"}, {"_id": 0})
    v = (s or {}).get("value") or {}
    from_email = (v.get("from_email") or "").strip()
    from_name = (v.get("from_name") or "NOWCOMMAND").strip()
    reply_to = (v.get("reply_to") or "").strip()
    if from_email:
        from_full = f"{from_name} <{from_email}>"
    else:
        from_full = os.environ.get("EMAIL_FROM", "NOWCOMMAND <onboarding@resend.dev>")
        from_email = from_full.split("<")[-1].rstrip(">").strip()
    using_dev_domain = from_email.endswith("@resend.dev")
    return {"from_full": from_full, "from_email": from_email, "reply_to": reply_to, "using_dev_domain": using_dev_domain}


async def send_email(to: str, subject: str, html: str, kind: str = "transactional", text: Optional[str] = None) -> dict:
    """Always log to outbox collection; deliver via Resend if API key set."""
    db = get_db()
    record = {
        "id": str(uuid.uuid4()),
        "to": to,
        "subject": subject,
        "html": html,
        "text": text or "",
        "kind": kind,
        "status": "queued",
        "created_at": now_iso(),
        "sent_at": None,
        "provider_id": None,
        "error": None,
    }
    api_key = (os.environ.get("RESEND_API_KEY") or "").strip()
    if api_key:
        try:
            import resend
            resend.api_key = api_key
            cfg = await _email_config()
            params = {
                "from": cfg["from_full"],
                "to": [to],
                "subject": subject,
                "html": html,
            }
            if cfg["reply_to"]:
                params["reply_to"] = cfg["reply_to"]
            r = resend.Emails.send(params)
            record["status"] = "sent"
            record["sent_at"] = now_iso()
            record["provider_id"] = (r or {}).get("id")
        except Exception as e:
            log.exception("Resend send failed")
            record["status"] = "failed"
            record["error"] = str(e)
    else:
        record["status"] = "queued_no_key"
    await db.emails_outbox.insert_one(record)
    record.pop("_id", None)
    return record


def wrap_html(title: str, body_html: str, cta_url: Optional[str] = None, cta_label: Optional[str] = None) -> str:
    cta = ""
    if cta_url and cta_label:
        cta = f"""
        <a href="{cta_url}" style="display:inline-block;margin-top:24px;padding:16px 28px;background:#D4AF37;color:#0A0A0A;text-decoration:none;font-family:Outfit,sans-serif;letter-spacing:0.1em;text-transform:uppercase;font-weight:600">{cta_label}</a>
        """
    return f"""
    <html><body style="margin:0;padding:0;background:#0A0A0A;color:#F2EFE9;font-family:Outfit,Helvetica,Arial,sans-serif">
      <div style="max-width:600px;margin:0 auto;padding:48px 32px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:0.3em;color:#D4AF37;text-transform:uppercase;margin-bottom:24px">NOWCOMMAND // Robin Angel</div>
        <h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:36px;line-height:1.1;color:#F2EFE9;margin:0 0 24px 0;font-weight:600">{title}</h1>
        <div style="font-size:16px;line-height:1.7;color:#A39F98">{body_html}</div>
        {cta}
        <hr style="border:none;border-top:1px solid #332D21;margin:48px 0 24px 0"/>
        <div style="font-size:12px;color:#66635D">Cast out Mammon. Rule over the Increase. Operate in Divine Timing.</div>
      </div>
    </body></html>
    """
