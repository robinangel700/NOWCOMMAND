import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Hourglass, Download, Check } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState("polling");
  const [tx, setTx] = useState(null);
  const { refresh, user } = useAuth();
  const nav = useNavigate();
  const sessionId = params.get("session_id");

  useEffect(() => {
    if (!sessionId) { nav("/"); return; }
    let attempts = 0;
    const poll = async () => {
      try {
        const { data } = await api.get(`/checkout/status/${sessionId}`);
        setTx(data);
        if (data.payment_status === "paid") {
          setStatus("paid");
          await refresh();
          return;
        }
        if (data.status === "expired") { setStatus("expired"); return; }
        if (attempts++ < 10) setTimeout(poll, 2000);
        else setStatus("timeout");
      } catch (e) {
        if (attempts++ < 10) setTimeout(poll, 2500);
        else setStatus("error");
      }
    };
    poll();
  }, [sessionId, refresh, nav]);

  const downloadPDF = async () => {
    try {
      const resp = await api.get("/downloads/mammon_breaker", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "Mammon_Breaker_Activation_Codes.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch { toast.error("Could not download — try the dashboard"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-32">
      <div className="max-w-2xl w-full">
        {status === "polling" && (
          <div className="text-center">
            <Hourglass className="w-8 h-8 text-gold animate-glow mx-auto mb-6" />
            <h1 className="font-display text-4xl text-cream">Sealing your seat…</h1>
            <p className="text-textMuted mt-3">Stripe is finalizing. This takes a few seconds.</p>
          </div>
        )}
        {status === "paid" && tx && (
          <div className="panel p-10 animate-fade-up" data-testid="checkout-success-panel">
            <div className="overline mb-4">// THRESHOLD CROSSED</div>
            <h1 className="font-display text-5xl text-cream leading-none">You're in.</h1>
            <p className="text-textMuted mt-4 leading-relaxed">
              Your seat is active. Your first transmission &mdash; <em>The Mammon Breaker Activation Codes</em> &mdash; is ready to download.
              A copy has also been sent to <span className="text-cream">{user?.email}</span>.
            </p>
            <div className="gold-line my-8" />
            <div className="flex flex-wrap gap-4">
              <button data-testid="download-pdf-now" onClick={downloadPDF} className="btn-gold"><Download className="w-4 h-4" /> Activation Codes</button>
              <button data-testid="download-book-now" onClick={async () => {
                try {
                  const resp = await api.get("/downloads/welcome_book", { responseType: "blob" });
                  const url = window.URL.createObjectURL(new Blob([resp.data], { type: "application/pdf" }));
                  const a = document.createElement("a"); a.href = url; a.download = "Dominion_Over_Mammon.pdf"; a.click(); window.URL.revokeObjectURL(url);
                  toast.success("Book downloaded");
                } catch { toast.error("Could not download"); }
              }} className="btn-ghost"><Download className="w-4 h-4" /> Welcome Book</button>
              <button data-testid="go-dashboard" onClick={() => nav("/dashboard")} className="btn-ghost">Enter your dashboard</button>
            </div>
            <ul className="mt-10 space-y-3 text-sm text-textMuted">
              {["Read the codes once tonight.","Open the Manifesto in the Community Vault.","Post in the Weekly Biggest Win thread.","Saturday's drop is already scheduled."].map((s,i)=>(
                <li key={i} className="flex gap-3"><Check className="w-4 h-4 text-gold mt-0.5"/>{s}</li>
              ))}
            </ul>
          </div>
        )}
        {(status === "expired" || status === "timeout" || status === "error") && (
          <div className="text-center">
            <h1 className="font-display text-4xl text-cream">Something blocked the seal.</h1>
            <p className="text-textMuted mt-3">Try again from the pricing page.</p>
            <button onClick={() => nav("/pricing")} className="btn-gold mt-6">Back to pricing</button>
          </div>
        )}
      </div>
    </div>
  );
}
