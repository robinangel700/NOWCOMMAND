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
    slug: Optional[str] = None  # auto-generated if empty
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
    sales_copy_md: Optional[str] = None  # custom sales pitch shown at bottom of free articles
    optin_headline: Optional[str] = None
    optin_cta: Optional[str] = None


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
    pronouns: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    setup_completed: Optional[bool] = None


class EmailTemplateUpdate(BaseModel):
    subject_override: Optional[str] = None
    html_override: Optional[str] = None  # if set, replaces default body
