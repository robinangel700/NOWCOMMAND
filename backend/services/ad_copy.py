"""Generate ad copy variants (FB long, IG short, story, hook+CTA) from a drop or article.

No LLM required — template-based remix that takes title, insight_preview/excerpt and
body to produce multiple high-converting copy options. Robin can tweak before posting.
"""
import random
from typing import Dict, List


HOOKS = [
    "Your morning latte is a routine luxury. This is your financial destiny.",
    "Years of stagnation are about to compress into sudden acceleration.",
    "Mammon obeys a steward. Stewards obey Kairos.",
    "You do not chase money. You assign it.",
    "What if the spirit of delay was a tenant, not your landlord?",
    "$44 to command your own economic atmosphere.",
    "Stewardship is the new strategy.",
    "Your bloodline is listening. Speak.",
]

CTAS_MEMBER = [
    "Open the new drop in your dashboard →",
    "It just landed inside NOWCOMMAND. Open and apply.",
    "Read it tonight. Apply one line by morning.",
    "Don't scroll past this. Open it.",
]

CTAS_FUNNEL = [
    "Free chapter inside the Tuesday transmission. Subscribe at nowcommand.",
    "Read the full piece on the NOWCOMMAND blog. Free.",
    "300 seats. Then the doors close. Claim yours.",
    "Cross the threshold. NOWCOMMAND is open for {days} more days at $44.",
]


def for_drop(d: Dict, public: bool = False, days_left: int = 21) -> List[Dict]:
    """Build 5 variants. public=True targets free FB group / social. public=False targets paid members."""
    title = d.get("title", "")
    preview = d.get("insight_preview") or (d.get("body_md") or "")[:240]
    cta_pool = CTAS_FUNNEL if public else CTAS_MEMBER
    hooks = random.sample(HOOKS, k=min(5, len(HOOKS)))
    out = []

    # 1. FB long-form
    out.append({
        "platform": "Facebook (long)",
        "copy": f"{hooks[0]}\n\n{preview}\n\nThis just dropped inside NOWCOMMAND: \"{title}\".\n\n"
                f"{cta_pool[0].replace('{days}', str(days_left))}",
    })
    # 2. IG short
    out.append({
        "platform": "Instagram (caption)",
        "copy": f"{hooks[1]}\n\n→ \"{title}\"\n\n{preview[:160]}…\n\n"
                f"{cta_pool[1 % len(cta_pool)].replace('{days}', str(days_left))}\n\n"
                f"#dominion #kairos #stewardship #nowcommand",
    })
    # 3. Story
    out.append({
        "platform": "Story / Reel hook",
        "copy": f"{hooks[2]}\n\nNew drop: \"{title}\"\n\n{cta_pool[2 % len(cta_pool)].replace('{days}', str(days_left))}",
    })
    # 4. Twitter / X
    out.append({
        "platform": "X / Threads",
        "copy": f"{hooks[3]} \n\n\"{title}\" \u2014 just live inside NOWCOMMAND. {cta_pool[0].replace('{days}', str(days_left))}",
    })
    # 5. Email broadcast
    out.append({
        "platform": "Email broadcast",
        "copy": f"Subject: {title}\n\n{hooks[4]}\n\n{preview}\n\n"
                f"{cta_pool[3 % len(cta_pool)].replace('{days}', str(days_left))}",
    })
    return out


def for_article(a: Dict, public: bool = True) -> List[Dict]:
    title = a.get("title", "")
    excerpt = a.get("excerpt") or (a.get("body_md") or "")[:240]
    hooks = random.sample(HOOKS, k=min(5, len(HOOKS)))
    return [
        {"platform": "Facebook (long)", "copy": f"{hooks[0]}\n\n{excerpt}\n\nNew on the NOWCOMMAND blog: \"{title}\". Free to read. Link in comments."},
        {"platform": "Instagram (caption)", "copy": f"{hooks[1]}\n\n\"{title}\"\n\n{excerpt[:160]}…\n\nFree read on the blog. Link in bio.\n\n#dominion #kairos #stewardship"},
        {"platform": "Story / Reel hook", "copy": f"{hooks[2]}\n\n\"{title}\" \u2014 free on the blog. Tap to read."},
        {"platform": "X / Threads", "copy": f"{hooks[3]}\n\n\"{title}\" \u2014 free read on the NOWCOMMAND blog. The Tuesday transmission goes deeper."},
        {"platform": "Email broadcast", "copy": f"Subject: {title}\n\n{hooks[4]}\n\n{excerpt}\n\nRead it free on the NOWCOMMAND blog. The full vault is inside the membership."},
    ]
