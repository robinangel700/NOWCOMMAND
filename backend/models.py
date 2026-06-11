"""Pydantic request/response models."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    token: str
    user: dict


class CheckoutIn(BaseModel):
    plan: Literal["full_monthly", "full_annual", "foundational_monthly"]
    origin_url: str


class AlacarteCheckoutIn(BaseModel):
    drop_id: str
    origin_url: str


class DropIn(BaseModel):
    title: str
    body_md: str
    media_url: Optional[str] = None
    foundational: bool = False
    scheduled_for: Optional[str] = None  # ISO
    insight_preview: Optional[str] = None
    quick_win: bool = False  # under 15 min
    alacarte_price_cents: Optional[int] = None  # if set => a-la-carte sale required
    tags: List[str] = []
    youtube_url: Optional[str] = None
    transcript_md: Optional[str] = None
    related_links: List[dict] = []  # [{title, url}]
    community_announcement: Optional[str] = None


class DropUpdateLegacy(BaseModel):
    """Kept for compatibility; new DropUpdate above superseded it."""
    pass


class PostIn(BaseModel):
    body: str
    kind: Literal["regular", "win"] = "regular"


class CommentIn(BaseModel):
    body: str


class NoteIn(BaseModel):
    drop_id: str
    body: str


class QuizQuestion(BaseModel):
    q: str
    options: List[str]
    correct_index: int


class QuizIn(BaseModel):
    drop_id: str
    title: str
    questions: List[QuizQuestion]


class QuizAttemptIn(BaseModel):
    answers: List[int]


class LearningPathIn(BaseModel):
    title: str
    description: Optional[str] = None
    ordered_drop_ids: List[str] = []


class ChecklistItemIn(BaseModel):
    title: str
    description: Optional[str] = None


class SettingsIn(BaseModel):
    key: str
    value: dict


class MonthlySummaryIn(BaseModel):
    matters: List[str]  # 3 bullets
    ignore: List[str]
    one_resource: str
    send_now: bool = False


class ReminderIn(BaseModel):
    title: str
    when: Optional[str] = None  # ISO


class CancelIn(BaseModel):
    reason: Optional[str] = None
    action: Literal["pause", "downgrade", "cancel"]


class WaitlistIn(BaseModel):
    email: EmailStr


class ManifestoIn(BaseModel):
    body_md: str


class ArticleIn(BaseModel):
    title: str
    slug: Optional[str] = None
    subtitle: Optional[str] = None
    excerpt: Optional[str] = None
    body_md: str
    cover_image_url: Optional[str] = None
    tags: List[str] = []
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    og_image_url: Optional[str] = None
    vault: bool = False
    scheduled_for: Optional[str] = None
    sales_copy_md: Optional[str] = None
    optin_headline: Optional[str] = None
    optin_cta: Optional[str] = None
    post_kind: Literal["essay", "youtube", "short", "video"] = "essay"
    youtube_url: Optional[str] = None


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    subtitle: Optional[str] = None
    excerpt: Optional[str] = None
    body_md: Optional[str] = None
    cover_image_url: Optional[str] = None
    tags: Optional[List[str]] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    og_image_url: Optional[str] = None
    vault: Optional[bool] = None
    scheduled_for: Optional[str] = None
    sales_copy_md: Optional[str] = None
    optin_headline: Optional[str] = None
    optin_cta: Optional[str] = None
    published: Optional[bool] = None


class LeadIn(BaseModel):
    email: EmailStr
    source: Optional[str] = None  # e.g. article slug
    name: Optional[str] = None


class ProfileIn(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    cover_position_y: Optional[int] = None
    location: Optional[str] = None
    website: Optional[str] = None
    setup_completed: Optional[bool] = None


class EmailTemplateUpdate(BaseModel):
    subject_override: Optional[str] = None
    html_override: Optional[str] = None


class BrandIn(BaseModel):
    site_name: Optional[str] = None
    tagline: Optional[str] = None
    primary_hex: Optional[str] = None      # gold
    primary_hi_hex: Optional[str] = None
    ink_hex: Optional[str] = None          # cream / text
    bg_hex: Optional[str] = None           # void / background
    surface_hex: Optional[str] = None
    border_hex: Optional[str] = None
    display_font: Optional[str] = None
    body_font: Optional[str] = None
    mono_font: Optional[str] = None
    logo_url: Optional[str] = None


class PricingIn(BaseModel):
    full_monthly_cents: Optional[int] = None
    full_annual_cents: Optional[int] = None
    foundational_monthly_cents: Optional[int] = None
    full_after_promo_monthly_cents: Optional[int] = None
    promo_days: Optional[int] = None
    cap: Optional[int] = None
    show_foundational_publicly: Optional[bool] = None


class TestimonialIn(BaseModel):
    body: str
    headline: Optional[str] = None


class TestimonialModerate(BaseModel):
    status: Literal["pending", "approved", "featured", "rejected"]
    headline: Optional[str] = None
    body: Optional[str] = None


class DropCommentIn(BaseModel):
    body: str
    cross_post_to_community: bool = True


class DMSendIn(BaseModel):
    recipient_id: str
    body: str


class NotifPrefsIn(BaseModel):
    # admin prefs
    admin_on_signup: Optional[bool] = None
    admin_on_purchase: Optional[bool] = None
    admin_on_cancel: Optional[bool] = None
    admin_on_post: Optional[bool] = None
    admin_on_testimonial: Optional[bool] = None
    admin_on_lead: Optional[bool] = None
    admin_on_payment_failed: Optional[bool] = None
    admin_digest_frequency: Optional[Literal["instant", "hourly", "daily", "off"]] = None
    # member prefs
    member_daily_digest: Optional[bool] = None
    member_drop_announcement: Optional[bool] = None
    member_dm_notify: Optional[bool] = None


class DropUpdate(BaseModel):
    title: Optional[str] = None
    body_md: Optional[str] = None
    media_url: Optional[str] = None
    foundational: Optional[bool] = None
    scheduled_for: Optional[str] = None
    insight_preview: Optional[str] = None
    quick_win: Optional[bool] = None
    alacarte_price_cents: Optional[int] = None
    tags: Optional[List[str]] = None
    published: Optional[bool] = None
    youtube_url: Optional[str] = None
    transcript_md: Optional[str] = None
    related_links: Optional[List[dict]] = None
    community_announcement: Optional[str] = None
