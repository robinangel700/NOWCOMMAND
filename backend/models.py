"""Pydantic request/response models."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal


class SignupIn(BaseModel):
    email: EmailStr
    password: str
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
