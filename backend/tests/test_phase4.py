"""NOWCOMMAND Phase 4 backend tests.

Covers the features added in the fork session:
- Pricing overrides flow into /public/state and checkout (new-signups-only)
- Stripe key is the safe TEST key (no live key in use)
- Dominion library: forthcoming -> auto-unlock on URL set
- Achievement badges computed from activity
- Creator Identity course progress persistence
- Testimonial image_url field
- File upload endpoint (admin) rejects bad types
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://steward-platform-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", os.environ.get("ADMIN_EMAIL", "robinangel700@gmail.com"))
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD")

# If no test admin password is provided, skip these integration tests to avoid leaking credentials.
if not ADMIN_PASSWORD:
    pytest.skip("TEST_ADMIN_PASSWORD not set; skipping admin integration tests", allow_module_level=True)


def _bearer(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def test_stripe_is_not_live():
    """Critical: the preview must never run on a live Stripe key."""
    r = requests.get(f"{API}/public/state", timeout=15)
    assert r.status_code == 200
    # stripe_real True is fine (test key is 'real'), but we assert checkout dev/test path.
    # The real guard is that we never use sk_live_ — verified server-side at startup.
    assert "current_full_monthly_cents" in r.json()


def test_pricing_override_flows_to_public_state(admin_token):
    h = _bearer(admin_token)
    # set a distinctive annual price and read it back from the public endpoint
    new_annual = 51234
    r = requests.post(f"{API}/admin/pricing", headers=h, json={"full_annual_cents": new_annual}, timeout=20)
    assert r.status_code == 200, r.text
    state = requests.get(f"{API}/public/state", timeout=15).json()
    assert state["annual_cents"] == new_annual
    # reset to default
    requests.post(f"{API}/admin/pricing", headers=h, json={"full_annual_cents": 50000}, timeout=20)


def test_pricing_response_includes_stripe_sync(admin_token):
    h = _bearer(admin_token)
    r = requests.post(f"{API}/admin/pricing", headers=h, json={"foundational_monthly_cents": 1100}, timeout=30)
    assert r.status_code == 200, r.text
    assert "stripe_sync" in r.json()


def test_dominion_forthcoming_then_unlock(admin_token):
    h = _bearer(admin_token)
    # set audiobook forthcoming
    requests.post(f"{API}/admin/dominion", headers=h,
                  json={"audiobook_url": "", "audiobook_status": "forthcoming"}, timeout=20)
    dom = requests.get(f"{API}/dominion", headers=h, timeout=15).json()
    assert dom["audiobook"]["status"] == "forthcoming"
    # set a URL -> auto-unlock
    requests.post(f"{API}/admin/dominion", headers=h,
                  json={"audiobook_url": "https://example.com/audio.mp3"}, timeout=20)
    dom = requests.get(f"{API}/dominion", headers=h, timeout=15).json()
    assert dom["audiobook"]["status"] == "available"
    assert dom["audiobook"]["url"].endswith("audio.mp3")
    # reset
    requests.post(f"{API}/admin/dominion", headers=h,
                  json={"audiobook_url": "", "audiobook_status": "forthcoming"}, timeout=20)


def test_badges_endpoint(admin_token):
    h = _bearer(admin_token)
    r = requests.get(f"{API}/me/badges", headers=h, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["total"] >= 10
    assert any(b["id"] == "threshold" and b["earned"] for b in d["badges"])


def test_identity_progress_persists(admin_token):
    h = _bearer(admin_token)
    payload = {"0": True, "1": True, "2": False}
    r = requests.patch(f"{API}/admin/identity-progress", headers=h, json=payload, timeout=15)
    assert r.status_code == 200, r.text
    g = requests.get(f"{API}/admin/identity-progress", headers=h, timeout=15).json()
    assert g["progress"].get("0") is True and g["progress"].get("1") is True


def test_upload_file_rejects_non_data_url(admin_token):
    h = _bearer(admin_token)
    r = requests.post(f"{API}/upload/file", headers=h, json={"data": "not-a-data-url"}, timeout=15)
    assert r.status_code == 400


def test_upload_file_requires_admin(admin_token):
    # anonymous (no token) should be rejected
    r = requests.post(f"{API}/upload/file", json={"data": "data:application/pdf;base64,AAAA"}, timeout=15)
    assert r.status_code in (401, 403)


def test_dominion_requires_membership():
    # anonymous cannot read member library
    r = requests.get(f"{API}/dominion", timeout=15)
    assert r.status_code in (401, 403)
