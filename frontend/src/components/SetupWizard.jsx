import { useEffect, useState } from "react";
import { X, ArrowRight, Check, User as UserIcon, BookOpen, Download, MessageCircle } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "profile", label: "Profile" },
  { id: "codes", label: "Codes" },
  { id: "manifesto", label: "Manifesto" },
  { id: "win", label: "First Win" },
  { id: "done", label: "Done" },
];

export default function SetupWizard({ onClose }) {
  const { user, refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ name: user?.name || "", avatar_url: user?.avatar_url || "", bio: user?.bio || "" });
  const [win, setWin] = useState("");
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const saveProfile = async () => {
    try { await api.patch("/me/profile", profile); await refresh(); next(); }
    catch (e) { console.error("Save profile failed", e); toast.error("Couldn't save profile"); }
  };
  const downloadCodes = async () => {
    try {
      const resp = await api.get("/downloads/mammon_breaker", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url;
      a.download = "Mammon_Breaker_Activation_Codes.pdf"; a.click();
      window.URL.revokeObjectURL(url); toast.success("Downloaded");
    } catch (e) { console.error("Wizard download failed", e); toast.error("Could not download"); }
  };
  const postWin = async () => {
    if (!win.trim()) { next(); return; }
    try { await api.post("/community/posts", { body: win, kind: "win" }); toast.success("Posted to the win thread"); next(); }
    catch (e) { console.error("Wizard win post failed", e); toast.error("Could not post"); }
  };
  const complete = async () => {
    try { await api.patch("/me/profile", { setup_completed: true }); await refresh(); onClose?.(); }
    catch (e) { console.error("Wizard completion failed", e); onClose?.(); }
  };

  return (
    <div className="fixed inset-0 bg-void/95 z-[60] flex items-center justify-center p-4 overflow-auto" data-testid="setup-wizard">
      <div className="panel max-w-2xl w-full p-8 md:p-12 relative animate-fade-up">
        <button onClick={() => { onClose?.(); }} data-testid="wizard-close" className="absolute top-4 right-4 text-textMuted hover:text-cream"><X className="w-5 h-5"/></button>

        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className={`flex-1 h-1 ${i <= step ? "bg-gold" : "bg-borderGold"}`}></div>
          ))}
        </div>

        {step === 0 && (
          <div>
            <div className="overline mb-3">// STEP 1 / 5</div>
            <h2 className="font-display text-5xl text-cream leading-tight">Welcome to NOWCOMMAND, {user?.name?.split(" ")[0] || "Sovereign"}.</h2>
            <p className="text-textMuted mt-4 text-lg leading-relaxed">You crossed the threshold. The next 60 seconds set the tone for everything. Five quick steps. Then you're free to roam.</p>
            <button data-testid="wizard-next" onClick={next} className="btn-gold mt-8">Begin <ArrowRight className="w-4 h-4"/></button>
          </div>
        )}
        {step === 1 && (
          <div>
            <div className="overline mb-3">// STEP 2 / 5 &middot; PROFILE</div>
            <h2 className="font-display text-4xl text-cream">Show the community who walked in.</h2>
            <p className="text-textMuted mt-2">A photo and one line. You can change this anytime in /profile.</p>
            <div className="mt-6 space-y-4">
              <div><label className="overline">// NAME</label><input data-testid="wiz-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}/></div>
              <div><label className="overline">// AVATAR URL (paste an image link)</label><input data-testid="wiz-avatar" value={profile.avatar_url} onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })} placeholder="https://..."/></div>
              <div><label className="overline">// ONE-LINE BIO</label><input data-testid="wiz-bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Stepping into..."/></div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={back} className="btn-ghost">Back</button>
              <button data-testid="wiz-save-profile" onClick={saveProfile} className="btn-gold">Save & continue <ArrowRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <div className="overline mb-3">// STEP 3 / 5 &middot; ACTIVATION CODES</div>
            <h2 className="font-display text-4xl text-cream">Download the Mammon Breaker Codes.</h2>
            <p className="text-textMuted mt-2">Read once tonight. Read again tomorrow. Then keep it on your desk for 30 days.</p>
            <div className="flex gap-3 mt-8">
              <button onClick={back} className="btn-ghost">Back</button>
              <button data-testid="wiz-download" onClick={downloadCodes} className="btn-ghost"><Download className="w-4 h-4"/> Download PDF</button>
              <button data-testid="wiz-next-3" onClick={next} className="btn-gold">Continue <ArrowRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <div className="overline mb-3">// STEP 4 / 5 &middot; MANIFESTO</div>
            <h2 className="font-display text-4xl text-cream">Read the Manifesto.</h2>
            <p className="text-textMuted mt-2">It's pinned in the community vault. Two minutes of reading anchors everything that follows.</p>
            <div className="flex gap-3 mt-8">
              <button onClick={back} className="btn-ghost">Back</button>
              <Link data-testid="wiz-manifesto-link" to="/community" className="btn-ghost"><BookOpen className="w-4 h-4"/> Open Manifesto</Link>
              <button data-testid="wiz-next-4" onClick={next} className="btn-gold">Continue <ArrowRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}
        {step === 4 && user?.tier === "full" && (
          <div>
            <div className="overline mb-3">// STEP 5 / 5 &middot; FIRST WIN</div>
            <h2 className="font-display text-4xl text-cream">Post one sentence in the Win thread.</h2>
            <p className="text-textMuted mt-2">Even "I showed up" counts. That single act re-anchors the codes.</p>
            <textarea data-testid="wiz-win" rows={3} className="mt-4" value={win} onChange={(e) => setWin(e.target.value)} placeholder="My biggest win this week is..."/>
            <div className="flex gap-3 mt-8">
              <button onClick={back} className="btn-ghost">Back</button>
              <button data-testid="wiz-post-win" onClick={postWin} className="btn-gold"><MessageCircle className="w-4 h-4"/>{win.trim() ? "Post & continue" : "Skip"}</button>
            </div>
          </div>
        )}
        {step === 4 && user?.tier !== "full" && (
          <div>
            <div className="overline mb-3">// STEP 5 / 5</div>
            <h2 className="font-display text-4xl text-cream">You're ready.</h2>
            <p className="text-textMuted mt-2">Foundational tier doesn't include the community, but everything else is unlocked. Explore your dashboard.</p>
            <div className="flex gap-3 mt-8">
              <button onClick={back} className="btn-ghost">Back</button>
              <button data-testid="wiz-next-5b" onClick={next} className="btn-gold">Continue <ArrowRight className="w-4 h-4"/></button>
            </div>
          </div>
        )}
        {step === 5 && (
          <div className="text-center">
            <Check className="w-12 h-12 text-gold mx-auto mb-4 animate-glow"/>
            <h2 className="font-display text-5xl text-cream">You're in.</h2>
            <p className="text-textMuted mt-3">The codes are moving. Saturday's drop is already scheduled.</p>
            <button data-testid="wiz-complete" onClick={complete} className="btn-gold mt-8">Enter the realm</button>
          </div>
        )}
      </div>
    </div>
  );
}
