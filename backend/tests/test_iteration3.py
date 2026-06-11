"""NOWREALM Iteration 3 backend tests.

Covers:
- Brand (public + admin) settings
- Pricing (admin) settings + doors.cap sync
- Testimonials (submit/moderate/public/win-to)
- Drop comments + cross-post; private notes do NOT create posts
- DMs (send/threads/thread/marks-read)
- Notification prefs
- Image upload via data URL
- Welcome book download (PDF for member, 403 for anon)
- Ad-copy generator (drop + article, 5 variants each)
- Admin drops with community_announcement => gold-banner pinned post
- Profile pronouns removal + cover_position_y persistence
- Admin signup / purchase / cancel outbox notifications
"""
import os
import uuid
import base64
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://money-momentum-5.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "robinangel700@gmail.com"
ADMIN_PASSWORD = "BoopLoop777"


def _rand_email(prefix="TEST_i3"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}@example.com"


def _bearer(t):
    return {"Authorization": f"Bearer {t}"}


# -------- shared fixtures --------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _make_full(prefix):
    email = _rand_email(prefix)
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "Pass1234!", "name": prefix}, timeout=15)
    assert r.status_code == 200, r.text
    tok = r.json()["token"]
    uid = r.json()["user"]["id"]
    sub = requests.post(f"{API}/checkout/subscription",
                        json={"plan": "full_monthly", "origin_url": BASE_URL},
                        headers=_bearer(tok), timeout=15).json()
    requests.get(f"{API}/checkout/status/{sub['session_id']}", headers=_bearer(tok), timeout=15)
    return {"email": email, "token": tok, "id": uid, "session_id": sub["session_id"]}


@pytest.fixture(scope="module")
def full_a():
    return _make_full("TEST_fullA")


@pytest.fixture(scope="module")
def full_b():
    return _make_full("TEST_fullB")


# ============== BRAND ==============
class TestBrand:
    def test_public_brand_defaults(self):
        r = requests.get(f"{API}/public/brand", timeout=10)
        assert r.status_code == 200
        b = r.json()
        for k in ["site_name", "tagline", "primary_hex", "primary_hi_hex", "ink_hex", "bg_hex",
                  "surface_hex", "border_hex", "display_font", "body_font", "mono_font", "logo_url"]:
            assert k in b, f"missing brand field {k}"
        assert len(b) >= 12

    def test_admin_brand_update_persists(self, admin_token):
        r = requests.post(f"{API}/admin/brand",
                          json={"tagline": "TEST tagline iteration3"},
                          headers=_bearer(admin_token), timeout=10)
        assert r.status_code == 200
        b = r.json()["brand"]
        assert b["tagline"] == "TEST tagline iteration3"
        # Public should reflect
        r2 = requests.get(f"{API}/public/brand", timeout=10).json()
        assert r2["tagline"] == "TEST tagline iteration3"


# ============== PRICING ==============
class TestPricing:
    def test_get_returns_7_fields(self, admin_token):
        r = requests.get(f"{API}/admin/pricing", headers=_bearer(admin_token), timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ["full_monthly_cents", "full_annual_cents", "foundational_monthly_cents",
                  "full_after_promo_monthly_cents", "promo_days", "cap", "show_foundational_publicly"]:
            assert k in d
        assert len(d) == 7

    def test_set_cap_syncs_doors(self, admin_token):
        # set cap=303 then verify doors.cap
        r = requests.post(f"{API}/admin/pricing", json={"cap": 303},
                          headers=_bearer(admin_token), timeout=10)
        assert r.status_code == 200
        s = requests.get(f"{API}/public/state", timeout=10).json()
        assert s["cap"] == 303
        # restore
        requests.post(f"{API}/admin/pricing", json={"cap": 300}, headers=_bearer(admin_token), timeout=10)


# ============== TESTIMONIALS ==============
class TestTestimonials:
    def test_submit_pending_and_moderate(self, full_a, admin_token):
        r = requests.post(f"{API}/testimonials",
                          json={"headline": "TEST head", "body": "TEST_BODY_i3 amazing"},
                          headers=_bearer(full_a["token"]), timeout=10)
        assert r.status_code == 200
        t = r.json()["testimonial"]
        assert t["status"] == "pending"
        tid = t["id"]

        # Public should NOT include pending
        pub = requests.get(f"{API}/public/testimonials", timeout=10).json()["testimonials"]
        assert not any(x["id"] == tid for x in pub)

        # Admin approve
        r2 = requests.patch(f"{API}/admin/testimonials/{tid}",
                            json={"status": "approved"}, headers=_bearer(admin_token), timeout=10)
        assert r2.status_code == 200
        pub2 = requests.get(f"{API}/public/testimonials", timeout=10).json()["testimonials"]
        assert any(x["id"] == tid for x in pub2)

    def test_win_to_testimonial(self, full_b, admin_token):
        post = requests.post(f"{API}/community/posts",
                             json={"body": "TEST_WIN_i3 huge breakthrough", "kind": "win"},
                             headers=_bearer(full_b["token"]), timeout=10).json()
        pid = post["id"]
        r = requests.post(f"{API}/admin/win-to-testimonial/{pid}",
                          headers=_bearer(admin_token), timeout=10)
        assert r.status_code == 200
        t = r.json().get("testimonial")
        assert t and t["status"] == "pending"
        assert t["source_post_id"] == pid
        assert "TEST_WIN_i3" in t["body"]


# ============== DROP COMMENTS + CROSS-POST ==============
class TestDropComments:
    drop_id = None

    def test_setup_drop(self, admin_token):
        r = requests.post(f"{API}/admin/drops",
                          json={"title": "TEST_i3_drop", "body_md": "body", "insight_preview": "ip"},
                          headers=_bearer(admin_token), timeout=10)
        assert r.status_code == 200
        TestDropComments.drop_id = r.json()["drop"]["id"]

    def test_comment_cross_post(self, full_a):
        r = requests.post(f"{API}/drops/{TestDropComments.drop_id}/comments",
                          json={"body": "TEST_COMMENT_xpost", "cross_post_to_community": True},
                          headers=_bearer(full_a["token"]), timeout=10)
        assert r.status_code == 200
        # Verify a community post was created with drop_id
        feed = requests.get(f"{API}/community/feed", headers=_bearer(full_a["token"]), timeout=10).json()
        match = [p for p in feed["posts"] if p.get("drop_id") == TestDropComments.drop_id and "TEST_COMMENT_xpost" in p["body"]]
        assert match, "Cross-posted community post not found"
        assert match[0].get("kind") == "drop_comment"

    def test_comment_no_cross_post(self, full_a):
        r = requests.post(f"{API}/drops/{TestDropComments.drop_id}/comments",
                          json={"body": "TEST_NO_XPOST", "cross_post_to_community": False},
                          headers=_bearer(full_a["token"]), timeout=10)
        assert r.status_code == 200
        feed = requests.get(f"{API}/community/feed", headers=_bearer(full_a["token"]), timeout=10).json()
        assert not any("TEST_NO_XPOST" in p["body"] for p in feed["posts"])

    def test_private_note_does_not_create_post(self, full_a):
        # Notes API should never produce community posts
        r = requests.post(f"{API}/notes",
                          json={"drop_id": TestDropComments.drop_id, "body": "TEST_PRIVATE_NOTE_i3"},
                          headers=_bearer(full_a["token"]), timeout=10)
        assert r.status_code == 200
        feed = requests.get(f"{API}/community/feed", headers=_bearer(full_a["token"]), timeout=10).json()
        assert not any("TEST_PRIVATE_NOTE_i3" in p["body"] for p in feed["posts"])


# ============== DM ==============
class TestDM:
    def test_send_threads_thread(self, full_a, full_b):
        # A -> B
        r = requests.post(f"{API}/dm/send",
                          json={"recipient_id": full_b["id"], "body": "TEST_DM_HI"},
                          headers=_bearer(full_a["token"]), timeout=10)
        assert r.status_code == 200

        # Threads from B side should show one unread
        tb = requests.get(f"{API}/dm/threads", headers=_bearer(full_b["token"]), timeout=10).json()["threads"]
        match = [t for t in tb if t.get("other", {}).get("id") == full_a["id"]]
        assert match
        assert match[0]["unread"] >= 1
        assert match[0]["other"]["id"] == full_a["id"]

        # B opens thread -> messages returned, recipient-side marked read
        th = requests.get(f"{API}/dm/thread/{full_a['id']}", headers=_bearer(full_b["token"]), timeout=10).json()
        assert any("TEST_DM_HI" in m["body"] for m in th["messages"])

        # B re-lists threads -> unread should be 0
        tb2 = requests.get(f"{API}/dm/threads", headers=_bearer(full_b["token"]), timeout=10).json()["threads"]
        match2 = [t for t in tb2 if t["key"] == match[0]["key"]][0]
        assert match2["unread"] == 0

    def test_cannot_dm_self(self, full_a):
        r = requests.post(f"{API}/dm/send",
                          json={"recipient_id": full_a["id"], "body": "x"},
                          headers=_bearer(full_a["token"]), timeout=10)
        assert r.status_code == 400


# ============== NOTIF PREFS ==============
class TestNotifPrefs:
    def test_get_returns_defaults_merged(self, admin_token):
        r = requests.get(f"{API}/me/notif-prefs", headers=_bearer(admin_token), timeout=10)
        assert r.status_code == 200
        p = r.json()["prefs"]
        for k in ["admin_on_signup", "admin_on_purchase", "admin_on_cancel",
                  "admin_on_testimonial", "admin_digest_frequency", "member_daily_digest"]:
            assert k in p

    def test_patch_updates(self, admin_token):
        r = requests.patch(f"{API}/me/notif-prefs",
                           json={"admin_on_post": True}, headers=_bearer(admin_token), timeout=10)
        assert r.status_code == 200
        assert r.json()["prefs"]["admin_on_post"] is True
        # revert
        requests.patch(f"{API}/me/notif-prefs", json={"admin_on_post": False},
                       headers=_bearer(admin_token), timeout=10)


# ============== IMAGE UPLOAD ==============
class TestUpload:
    def test_data_url_upload(self, full_a):
        # 1x1 transparent PNG
        png_b64 = (
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        )
        data_url = f"data:image/png;base64,{png_b64}"
        r = requests.post(f"{API}/upload/image",
                          json={"data": data_url, "purpose": "avatar"},
                          headers=_bearer(full_a["token"]), timeout=15)
        assert r.status_code == 200, r.text
        url = r.json()["url"]
        assert url.startswith("/static/uploads/")
        # File must actually be served
        r2 = requests.get(f"{BASE_URL}{url}", timeout=10)
        assert r2.status_code == 200


# ============== WELCOME BOOK PDF ==============
class TestWelcomeBook:
    def test_pdf_for_full(self, full_a):
        r = requests.get(f"{API}/downloads/welcome_book", headers=_bearer(full_a["token"]), timeout=20)
        assert r.status_code == 200
        assert r.content[:4] == b"%PDF"

    def test_pdf_forbidden_for_anon_tier(self):
        email = _rand_email("TEST_wb_anon")
        tok = requests.post(f"{API}/auth/signup",
                            json={"email": email, "password": "Pass1234!"}, timeout=10).json()["token"]
        r = requests.get(f"{API}/downloads/welcome_book", headers=_bearer(tok), timeout=10)
        assert r.status_code == 403


# ============== AD COPY ==============
class TestAdCopy:
    def test_drop_5_variants(self, admin_token):
        # Reuse drop created earlier or create new
        drop_id = TestDropComments.drop_id
        if not drop_id:
            r = requests.post(f"{API}/admin/drops",
                              json={"title": "TEST_adcopy", "body_md": "x"},
                              headers=_bearer(admin_token), timeout=10)
            drop_id = r.json()["drop"]["id"]
        r = requests.post(f"{API}/admin/ad-copy/drop/{drop_id}",
                          json={"public": True}, headers=_bearer(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        variants = r.json()["variants"]
        assert len(variants) == 5
        platforms = {v.get("platform") for v in variants}
        assert "copy" in variants[0] and variants[0]["copy"]
        # Should cover the major platforms
        assert {"FB", "IG", "X", "Email", "Story"}.issubset(platforms) or len(platforms) == 5

    def test_article_5_variants(self, admin_token):
        # create article
        a = requests.post(f"{API}/admin/articles",
                          json={"title": "TEST_adcopy_article", "body_md": "body"},
                          headers=_bearer(admin_token), timeout=10).json()["article"]
        r = requests.post(f"{API}/admin/ad-copy/article/{a['id']}",
                          json={"public": True}, headers=_bearer(admin_token), timeout=15)
        assert r.status_code == 200
        assert len(r.json()["variants"]) == 5
        requests.delete(f"{API}/admin/articles/{a['id']}", headers=_bearer(admin_token), timeout=10)


# ============== DROP COMMUNITY ANNOUNCEMENT ==============
class TestDropAnnouncement:
    def test_immediate_creates_gold_banner(self, admin_token):
        r = requests.post(f"{API}/admin/drops",
                          json={"title": "TEST_announce_i3", "body_md": "b", "insight_preview": "i",
                                "community_announcement": "TEST_GOLD_BANNER_msg"},
                          headers=_bearer(admin_token), timeout=10)
        assert r.status_code == 200
        drop = r.json()["drop"]
        assert drop["published"] is True
        # Now scan community feed for a gold-banner pinned post linked to this drop
        feed = requests.get(f"{API}/admin/community/feed", headers=_bearer(admin_token), timeout=10)
        if feed.status_code == 404:
            feed = requests.get(f"{API}/community/feed", headers=_bearer(admin_token), timeout=10)
        posts = feed.json().get("posts", [])
        match = [p for p in posts if p.get("drop_id") == drop["id"] and p.get("gold_banner")]
        assert match, f"No gold_banner post linked to drop {drop['id']}"
        assert match[0].get("pinned") is True


# ============== PROFILE (iteration 3 — pronouns must be removed) ==============
class TestProfileIter3:
    def test_cover_position_y_persists(self, full_a):
        r = requests.patch(f"{API}/me/profile",
                           json={"cover_position_y": 42, "location": "Galilee", "website": "https://nowrealm.test"},
                           headers=_bearer(full_a["token"]), timeout=10)
        assert r.status_code == 200, r.text
        pub = requests.get(f"{API}/users/{full_a['id']}/public",
                           headers=_bearer(full_a["token"]), timeout=10).json()["user"]
        assert pub.get("cover_position_y") == 42
        assert pub.get("location") == "Galilee"
        assert pub.get("website") == "https://nowrealm.test"
        # password must never appear
        assert "password" not in pub and "password_hash" not in pub

    def test_pronouns_removed_from_public_profile(self, full_a):
        """Spec: pronouns field should be GONE from the response."""
        pub = requests.get(f"{API}/users/{full_a['id']}/public",
                           headers=_bearer(full_a["token"]), timeout=10).json()["user"]
        assert "pronouns" not in pub, f"pronouns still present in public profile response: {pub}"


# ============== ADMIN NOTIFICATION EMAILS ==============
class TestAdminEmails:
    def test_signup_emits_admin_signup(self, admin_token):
        before = len(requests.get(f"{API}/admin/outbox", headers=_bearer(admin_token), timeout=10).json()["emails"])
        email = _rand_email("TEST_signup_email")
        requests.post(f"{API}/auth/signup", json={"email": email, "password": "Pass1234!"}, timeout=10)
        outbox = requests.get(f"{API}/admin/outbox", headers=_bearer(admin_token), timeout=10).json()["emails"]
        match = [e for e in outbox if e.get("kind") == "admin_signup" and email.lower() in (e.get("body", "") + e.get("subject", "")).lower()]
        assert match, "No admin_signup email queued"

    def test_purchase_emits_admin_purchase(self, admin_token, full_a):
        outbox = requests.get(f"{API}/admin/outbox", headers=_bearer(admin_token), timeout=10).json()["emails"]
        match = [e for e in outbox if e.get("kind") == "admin_purchase"]
        assert match, "No admin_purchase email in outbox"

    def test_cancel_emits_admin_cancel_and_user_confirm(self, admin_token):
        # Make a fresh full member, then cancel
        m = _make_full("TEST_cancel_email")
        r = requests.post(f"{API}/billing/cancel", json={"action": "cancel"},
                          headers=_bearer(m["token"]), timeout=10)
        assert r.status_code == 200
        outbox = requests.get(f"{API}/admin/outbox", headers=_bearer(admin_token), timeout=10).json()["emails"]
        admin_cancel = [e for e in outbox if e.get("kind") == "admin_cancel"]
        user_confirm = [e for e in outbox if e.get("kind") == "cancel_confirmation" and e.get("to", "").lower() == m["email"].lower()]
        assert admin_cancel, "No admin_cancel email"
        assert user_confirm, "No cancel_confirmation email to user"
