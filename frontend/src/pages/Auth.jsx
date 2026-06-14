import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { Hourglass } from "lucide-react";

export default function Auth({ mode = "login" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { login, signup } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const plan = params.get("plan");

  // Capture affiliate referral code from URL on signup page
  useEffect(() => {
    const ref = params.get("ref");
    if (ref) {
      sessionStorage.setItem("affiliate_ref", ref.trim().toUpperCase());
    }
  }, [params]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else {
        const ref = sessionStorage.getItem("affiliate_ref") || undefined;
        await signup(email, password, name, ref);
      }
      toast.success(mode === "login" ? "Welcome back" : "Account created. Now claim your seat.");
      if (plan) nav(`/pricing?auto=${plan}`); else nav("/dashboard");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Something went wrong");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <Hourglass className="w-5 h-5 text-gold animate-glow" />
          <div className="overline">// NOWCOMMAND</div>
        </div>
        <h1 className="font-display text-5xl text-cream leading-none mb-3">{mode === "login" ? "Re-enter" : "Cross over"}</h1>
        <p className="text-textMuted mb-4">{mode === "login" ? "Sign back into the realm." : "Create your seat. Stripe checkout is the next step."}</p>
        {plan && (
          <div className="mb-6 rounded border border-gold/20 bg-gold/5 p-4 text-sm text-cream">
            {mode === "login"
              ? "After signing in, you'll be redirected to Stripe checkout to complete your purchase."
              : "After creating your account, you'll be sent straight into Stripe checkout to complete your purchase."}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-6">
          {mode === "signup" && (
            <div>
              <label className="overline">// NAME</label>
              <input data-testid="auth-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your sovereign name" required />
            </div>
          )}
          <div>
            <label className="overline">// EMAIL</label>
            <input data-testid="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@dominion.com" required />
          </div>
          <div>
            <label className="overline">// PASSWORD</label>
            <input data-testid="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required />
          </div>
          <button data-testid="auth-submit" type="submit" disabled={busy} className="btn-gold w-full justify-center disabled:opacity-60">
            {busy ? "Working..." : mode === "login" ? "Sign in" : "Create my seat"}
          </button>
        </form>
        <div className="mt-8 text-sm text-textMuted">
          {mode === "login" ? (
            <>No account? <Link to="/signup" data-testid="auth-switch" className="text-gold hover:underline">Cross over</Link></>
          ) : (
            <>Already a member? <Link to="/login" data-testid="auth-switch" className="text-gold hover:underline">Sign in</Link></>
          )}
        </div>
      </div>
    </div>
  );
}
