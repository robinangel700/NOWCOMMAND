"""Generate 'Dominion Over Mammon & The Spirit of Delay' welcome book PDF."""
import os
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.colors import HexColor, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER

OUT_DIR = "/app/backend/static/downloads"
PDF_PATH = os.path.join(OUT_DIR, "dominion_over_mammon_book.pdf")


def ensure_pdf(force: bool = False) -> str:
    os.makedirs(OUT_DIR, exist_ok=True)
    if os.path.exists(PDF_PATH) and not force:
        return PDF_PATH

    doc = SimpleDocTemplate(PDF_PATH, pagesize=LETTER,
                            leftMargin=0.9 * inch, rightMargin=0.9 * inch,
                            topMargin=1.0 * inch, bottomMargin=0.9 * inch,
                            title="Dominion Over Mammon & The Spirit of Delay")
    styles = getSampleStyleSheet()
    gold = HexColor("#D4AF37")
    cream = HexColor("#F2EFE9")
    muted = HexColor("#A39F98")

    cover_title = ParagraphStyle("ctitle", parent=styles["Title"], fontName="Times-Bold",
                                 fontSize=46, leading=54, alignment=TA_LEFT, textColor=cream)
    cover_sub = ParagraphStyle("csub", parent=styles["Normal"], fontName="Helvetica-Oblique",
                               fontSize=14, leading=20, textColor=gold)
    over = ParagraphStyle("over", parent=styles["Normal"], fontName="Courier-Bold",
                          fontSize=10, leading=14, textColor=gold, spaceAfter=8)
    chapter = ParagraphStyle("ch", parent=styles["Heading1"], fontName="Times-Bold",
                             fontSize=28, leading=34, textColor=gold, spaceBefore=24, spaceAfter=12)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontName="Times-Bold",
                        fontSize=16, leading=20, textColor=cream, spaceBefore=14, spaceAfter=6)
    body = ParagraphStyle("body", parent=styles["BodyText"], fontName="Helvetica",
                          fontSize=11, leading=17, textColor=cream, spaceAfter=10)
    quote = ParagraphStyle("quote", parent=styles["BodyText"], fontName="Helvetica-Oblique",
                           fontSize=12, leading=18, textColor=gold, leftIndent=24, spaceAfter=14)

    def page_dec(canv, doc_):
        canv.saveState()
        canv.setFillColor(black)
        canv.rect(0, 0, LETTER[0], LETTER[1], fill=1, stroke=0)
        canv.setStrokeColor(gold)
        canv.setLineWidth(0.5)
        canv.rect(0.5 * inch, 0.5 * inch, LETTER[0] - 1 * inch, LETTER[1] - 1 * inch, stroke=1, fill=0)
        canv.setFont("Courier", 8)
        canv.setFillColor(gold)
        canv.drawString(0.9 * inch, 0.65 * inch, "DOMINION OVER MAMMON // ROBIN ANGEL")
        canv.drawRightString(LETTER[0] - 0.9 * inch, 0.65 * inch, f"PAGE {doc_.page}")
        canv.restoreState()

    story = []
    # Cover
    story.append(Spacer(1, 80))
    story.append(Paragraph("// THE NOWREALM PRESS // VOLUME ONE", over))
    story.append(Spacer(1, 30))
    story.append(Paragraph("Dominion Over Mammon", cover_title))
    story.append(Paragraph("&amp; The Spirit of Delay", cover_title))
    story.append(Spacer(1, 30))
    story.append(Paragraph("A field guide for the steward who refuses to wait.", cover_sub))
    story.append(Spacer(1, 60))
    story.append(Paragraph("by Robin Angel", cover_sub))
    story.append(PageBreak())

    # Foreword
    story.append(Paragraph("FOREWORD", chapter))
    story.append(Paragraph(
        "You are not lacking. You are stewarding. The Lord does not call us into deprivation; "
        "He calls us into dominion. And dominion is administered by stewards \u2014 not by survivors.",
        body))
    story.append(Paragraph(
        "Mammon is not money. Mammon is the <i>spirit</i> that uses money to enslave. "
        "It teaches you to bow to your bills, your bank balance, and your fear of the future. "
        "Chronos is its sibling \u2014 the spirit that teaches you to bow to the clock, to circumstance, "
        "and to the lie that &lsquo;next year&rsquo; is when the breakthrough comes.",
        body))
    story.append(Paragraph(
        "This book is short on purpose. You will read it in one sitting. "
        "You will leave it with seven activations you can run before sundown tomorrow.",
        body))
    story.append(PageBreak())

    chapters = [
        ("Chapter I", "Naming the Spirit",
         [("On Mammon", "Mammon is a master that demands worship. It is recognized by the way it makes you feel: anxious about the future, ashamed of the past, and suspicious of generosity. The first act of dominion is naming what you have been bowing to. Once it is named, it loses its hiding place."),
          ("On Chronos", "Chronos is sequential time \u2014 clock time \u2014 measured in identical units that never come back. It is the spirit that says: &lsquo;you must hurry,&rsquo; or worse, &lsquo;you have already missed it.&rsquo; This is the spirit that produced your stagnation. You will evict it.")]),
        ("Chapter II", "Operating in Kairos",
         [("The Opportune Moment", "Kairos is the &lsquo;right time&rsquo; \u2014 the appointed moment when heaven and earth agree. It cannot be scheduled. It can only be recognized. Kairos rewards the prepared and the present. Stewards live in Kairos by staying ready, staying obedient, and refusing to chase counterfeit urgency."),
          ("The Three Markers", "You will know a Kairos window by three markers: (1) a sudden alignment of resources you didn&rsquo;t orchestrate, (2) a peace that runs underneath the activity, (3) an obedience you can&rsquo;t explain rationally but cannot ignore. Move when those three converge.")]),
        ("Chapter III", "The Stewardship Mind",
         [("Money Is A Courier", "Money is not your master. It is a courier carrying instructions. Stewards send money on assignments. Servants of Mammon receive money&rsquo;s assignments. Decide which one you are. Then act like it for thirty days."),
          ("The Tithe of Imagination", "Before you tithe your income, tithe your imagination. The first 10% of your daydreams must be about kingdom expansion, generational legacy, and the freedom of others \u2014 not about your own survival. What the imagination consistently rehearses, the hand eventually executes.")]),
        ("Chapter IV", "Sovereign Rest",
         [("Hustle Is Counterfeit", "The world&rsquo;s hustle culture is Mammon&rsquo;s liturgy. Sovereign rest is the throne posture of a steward who knows the field belongs to the Lord. You will produce more from 4 rested hours than from 14 frantic ones. This is not laziness; this is the architecture of authority."),
          ("Strategic Stillness", "Block 90 minutes this week with no input \u2014 no phone, no podcast, no agenda. Sit with the Lord. That is where the codes download. Stewards who skip this step will manage tasks but never administer dominion.")]),
        ("Chapter V", "The Compression",
         [("The Bending Of The Timeline", "When you operate from Kairos and stewardship, the timeline bends. Years of stagnation compress into months of acceleration. Do not flinch when this happens. Do not negotiate the speed down. Receive the compression and obey the next instruction.")]),
        ("Chapter VI", "The Family Atmosphere",
         [("Speaking Over The House", "Your bloodline is listening. Speak over your household by name. Cancel one inherited verdict (&lsquo;we are always behind,&rsquo; &lsquo;money is hard,&rsquo; &lsquo;we never get the big breaks&rsquo;). Replace it out loud with the new verdict. Atmosphere is the ceiling your children inherit. Raise it on purpose.")]),
        ("Chapter VII", "The Practice",
         [("The 30-Day Activation", "For thirty days: (1) Read the Activation Codes once each morning. (2) Speak over your household before bed. (3) Block 90 minutes of strategic stillness weekly. (4) Send one instruction to your money daily \u2014 even a small one. (5) Refuse one item from your &lsquo;someday&rsquo; list each week and execute it before midnight.")]),
    ]
    for num, title, sections in chapters:
        story.append(Paragraph(num.upper(), over))
        story.append(Paragraph(title, chapter))
        for h, p in sections:
            story.append(Paragraph(h, h2))
            story.append(Paragraph(p, body))
        story.append(PageBreak())

    # Closing
    story.append(Paragraph("BENEDICTION", chapter))
    story.append(Paragraph(
        "May your hand be steady, your eye clear, and your timing divine. "
        "May the spirit of Mammon find no foothold, and the spirit of delay no welcome. "
        "May you steward the increase you were born to administer.",
        quote))
    story.append(Paragraph("\u2014 Robin Angel", body))

    doc.build(story, onFirstPage=page_dec, onLaterPages=page_dec)
    return PDF_PATH
