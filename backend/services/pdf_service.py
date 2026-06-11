"""Generate the Mammon Breaker Activation Codes placeholder PDF."""
import os
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER

OUT_DIR = "/app/backend/static/downloads"
PDF_PATH = os.path.join(OUT_DIR, "mammon_breaker_activation_codes.pdf")


def ensure_pdf(force: bool = False) -> str:
    os.makedirs(OUT_DIR, exist_ok=True)
    if os.path.exists(PDF_PATH) and not force:
        return PDF_PATH

    doc = SimpleDocTemplate(PDF_PATH, pagesize=LETTER,
                            leftMargin=0.9 * inch, rightMargin=0.9 * inch,
                            topMargin=0.9 * inch, bottomMargin=0.9 * inch,
                            title="The Mammon Breaker Activation Codes")
    styles = getSampleStyleSheet()
    gold = HexColor("#D4AF37")
    cream = HexColor("#F2EFE9")
    muted = HexColor("#66635D")

    title = ParagraphStyle("title", parent=styles["Title"], fontName="Times-Bold",
                           fontSize=34, leading=38, alignment=TA_LEFT, textColor=cream)
    over = ParagraphStyle("over", parent=styles["Normal"], fontName="Courier-Bold",
                          fontSize=10, leading=14, textColor=gold, spaceAfter=8)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontName="Times-Bold",
                        fontSize=18, leading=22, textColor=gold, spaceBefore=18, spaceAfter=8)
    body = ParagraphStyle("body", parent=styles["BodyText"], fontName="Helvetica",
                          fontSize=11, leading=16, textColor=cream)
    foot = ParagraphStyle("foot", parent=styles["BodyText"], fontName="Helvetica-Oblique",
                          fontSize=9, leading=12, textColor=muted)

    def page_decoration(canv, doc_):
        canv.saveState()
        canv.setFillColor(black)
        canv.rect(0, 0, LETTER[0], LETTER[1], fill=1, stroke=0)
        canv.setStrokeColor(gold)
        canv.setLineWidth(0.5)
        canv.rect(0.5 * inch, 0.5 * inch, LETTER[0] - 1 * inch, LETTER[1] - 1 * inch, stroke=1, fill=0)
        canv.setFont("Courier", 8)
        canv.setFillColor(gold)
        canv.drawString(0.9 * inch, 0.65 * inch, "NOWCOMMAND // ROBIN ANGEL")
        canv.drawRightString(LETTER[0] - 0.9 * inch, 0.65 * inch, f"PAGE {doc_.page}")
        canv.restoreState()

    story = []
    story.append(Paragraph("CODEX 001 // ACTIVATION", over))
    story.append(Paragraph("The Mammon Breaker<br/>Activation Codes", title))
    story.append(Spacer(1, 18))
    story.append(Paragraph(
        "You are not subscribing. You are crossing a threshold. What follows are the seven activations that "
        "dismantle the spirit of Mammon, evict the spirit of Chronos, and seat you in Kairos &mdash; divine timing.",
        body))
    story.append(Spacer(1, 12))
    story.append(Paragraph(
        "Read this once tonight. Read it again in the morning. Then keep it on your desk for thirty days.",
        body))

    codes = [
        ("CODE I &mdash; Dominion Recognition",
         "Money is not your master. It is a courier. Speak to it as a steward speaks to a servant. From this hour, every transaction is an instruction, not a request."),
        ("CODE II &mdash; Chronos Eviction",
         "Delay is a spirit, not a circumstance. Name it. Renounce it out loud. Refuse one item from your &lsquo;someday&rsquo; list and execute it before midnight."),
        ("CODE III &mdash; Kairos Entry",
         "Stop measuring in calendar units. Start measuring in moments of obedience. The next 24 hours contain a Kairos window &mdash; do not miss it watching the wrong clock."),
        ("CODE IV &mdash; The Increase Mandate",
         "You were not born to manage scarcity. You were born to rule over the increase. Identify one stream you have been &lsquo;hoping&rsquo; for and convert it into a decision today."),
        ("CODE V &mdash; Sovereign Rest",
         "Hustle is a Mammonic counterfeit. Rest is the throne posture. Schedule 90 minutes of strategic stillness this week. That is when the codes download."),
        ("CODE VI &mdash; Family Atmosphere",
         "Your bloodline is listening. Speak over your household by name. Cancel one inherited verdict (e.g. &lsquo;we are always behind&rsquo;) and replace it with the new verdict."),
        ("CODE VII &mdash; The Compression",
         "Years of stagnation will compress into sudden acceleration once these codes are operationalized. Expect the timeline to bend. Do not flinch when it does."),
    ]
    for h, p in codes:
        story.append(Paragraph(h, h2))
        story.append(Paragraph(p, body))

    story.append(PageBreak())
    story.append(Paragraph("WHAT TO DO NEXT", h2))
    story.append(Paragraph(
        "1. Log into your NOWCOMMAND dashboard.<br/>"
        "2. Read the One Page Manifesto in the Community Vault.<br/>"
        "3. Post one sentence in the Weekly Biggest Win thread &mdash; even if your win is just &lsquo;I showed up.&rsquo;<br/>"
        "4. Wait for Saturday. The drop is already scheduled.",
        body))
    story.append(Spacer(1, 24))

    doc.build(story, onFirstPage=page_decoration, onLaterPages=page_decoration)
    return PDF_PATH
