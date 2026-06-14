import { useEffect, useState, useRef } from "react";
import { api, fmt, BACKEND_URL } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Download, Sparkles, Send, ImagePlus } from "lucide-react";

export default function Testimonials() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [body, setBody] = useState(""); const [headline, setHeadline] = useState("");
  const [imageUrl, setImageUrl] = useState(""); const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  useEffect(() => { api.get("/public/testimonials").then((r) => setItems(r.data.testimonials)); document.title = "NOWCOMMAND — Testimonies"; }, []);
  const onPickImage = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 8 * 1024 * 1024) { toast.error("Image must be under 8MB"); return; }
    setUploading(true);
    try {
      const data = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
      const resp = await api.post("/upload/image", { data, purpose: "testimonial" });
      setImageUrl(resp.data.url); toast.success("Image attached");
    } catch (e) { console.error("Testimonial image upload failed", e); toast.error("Upload failed"); } finally { setUploading(false); }
  };
  const submit = async (e) => { e.preventDefault();
    if (!body.trim()) return;
    try { await api.post("/testimonials", { headline, body, image_url: imageUrl }); toast.success("Submitted — Robin will review."); setBody(""); setHeadline(""); setImageUrl(""); }
    catch (e) { console.error("Testimonial submission failed", e); toast.error("Submit failed"); }
  };
  const fullUrl = (u) => (!u ? "" : u.startsWith("http") ? u : `${BACKEND_URL}${u}`);
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-10 py-16">
      <div className="max-w-5xl mx-auto">
        <div className="overline mb-3">// TESTIMONIES</div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-cream leading-[1.05]">Wins from the realm.</h1>
        <p className="text-textMuted mt-4 max-w-2xl">Words from members who've stepped into Kairos. New ones land every week.</p>

        <div className="grid sm:grid-cols-2 gap-px bg-borderGold mt-12">
          {items.map((t) => (
            <article key={t.id} data-testid={`testimony-${t.id}`} className="bg-void p-8 relative">
              {t.status === "featured" && <div className="absolute top-3 right-3 overline text-gold"><Sparkles className="w-3 h-3 inline"/> FEATURED</div>}
              {t.headline && <h3 className="font-display text-2xl text-gold mb-3 leading-tight">"{t.headline}"</h3>}
              {t.image_url && <img src={fullUrl(t.image_url)} alt="" className="w-full max-h-72 object-cover border border-borderGold mb-4" />}
              <p className="text-cream/95 whitespace-pre-wrap leading-relaxed">{t.body}</p>
              <div className="mt-6 flex items-center gap-3 pt-5 border-t border-borderGold">
                <div className="w-10 h-10 border border-borderGold bg-surface overflow-hidden">
                  {t.user_avatar ? <img src={t.user_avatar} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-display text-gold">{(t.user_name||"?")[0]}</div>}
                </div>
                <div>
                  <div className="text-cream font-medium">{t.user_name}</div>
                  <div className="overline">{fmt.date(t.created_at)}</div>
                </div>
              </div>
            </article>
          ))}
          {items.length === 0 && <div className="bg-void p-10 col-span-full text-textMuted">No testimonies yet — be the first to share yours below.</div>}
        </div>

        {user?.tier === "full" || user?.tier === "foundational" || user?.role === "admin" ? (
          <form onSubmit={submit} className="mt-16 panel p-6 md:p-8" data-testid="testimony-form">
            <div className="overline mb-2">// SHARE YOUR WIN</div>
            <h3 className="font-display text-3xl text-cream">Tell us what shifted.</h3>
            <p className="text-textMuted mt-2">Robin reviews submissions before publishing. With your permission, your testimony may appear on this page and on Robin's socials.</p>
            <input data-testid="testimony-headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline (optional, e.g. 'My first month back in Kairos')" className="mt-5"/>
            <textarea data-testid="testimony-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What changed since you stepped into NOWCOMMAND?" className="mt-3"/>
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} className="hidden" data-testid="testimony-image-input" />
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost text-xs" data-testid="testimony-image-btn">
                <ImagePlus className="w-4 h-4"/> {uploading ? "Uploading…" : imageUrl ? "Change image" : "Attach a win screenshot (optional)"}
              </button>
              {imageUrl && <img src={fullUrl(imageUrl)} alt="" className="w-16 h-16 object-cover border border-borderGold"/>}
              {imageUrl && <button type="button" onClick={() => setImageUrl("")} className="overline text-ruby">Remove</button>}
            </div>
            <button data-testid="testimony-submit" type="submit" className="btn-gold mt-4"><Send className="w-4 h-4"/>Submit testimony</button>
          </form>
        ) : (
          <div className="mt-16 panel p-8 text-center">
            <Link to="/pricing" className="btn-gold">Cross the threshold to share your story</Link>
          </div>
        )}
      </div>
    </div>
  );
}
