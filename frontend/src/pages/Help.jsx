import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, MessageCircle, BookOpen, Users, Mail } from "lucide-react";

export default function Help() {
  const [step, setStep] = useState(0);
  return (
    <div className="min-h-screen px-4 sm:px-6 lg:px-10 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="overline mb-3">// SUPPORT</div>
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-cream">Need a hand?</h1>
        <p className="text-textMuted mt-4 max-w-2xl">Try these in order — most questions are resolved before you reach Robin.</p>

        <div className="mt-12 space-y-4">
          <Link to="/faq" className="block panel p-6 hover:border-borderGoldHi" data-testid="help-faq">
            <div className="flex items-center gap-4">
              <BookOpen className="w-6 h-6 text-gold"/>
              <div className="flex-1">
                <h3 className="font-display text-2xl text-cream">1. Browse the FAQ</h3>
                <p className="text-textMuted text-sm mt-1">90% of questions are answered here. Onboarding, billing, content, community, affiliate.</p>
              </div>
            </div>
          </Link>
          <Link to="/community" className="block panel p-6 hover:border-borderGoldHi" data-testid="help-community">
            <div className="flex items-center gap-4">
              <Users className="w-6 h-6 text-gold"/>
              <div className="flex-1">
                <h3 className="font-display text-2xl text-cream">2. Ask the community</h3>
                <p className="text-textMuted text-sm mt-1">Members help members. Often faster than waiting for any single response.</p>
              </div>
            </div>
          </Link>
          <div className="block panel p-6">
            <div className="flex items-center gap-4">
              <Search className="w-6 h-6 text-gold"/>
              <div className="flex-1">
                <h3 className="font-display text-2xl text-cream">3. Check the legal docs</h3>
                <p className="text-textMuted text-sm mt-1">Billing/refund questions: see the <Link to="/legal/terms" className="text-gold hover:underline">Terms</Link> and <Link to="/legal/privacy" className="text-gold hover:underline">Privacy Policy</Link>.</p>
              </div>
            </div>
          </div>

          {step < 1 ? (
            <button data-testid="help-still-stuck" onClick={() => setStep(1)} className="btn-ghost mt-6">Tried all three. Still stuck.</button>
          ) : (
            <div className="panel p-6 border-gold/50 mt-6" data-testid="help-email-block">
              <Mail className="w-6 h-6 text-gold mb-3"/>
              <h3 className="font-display text-2xl text-cream">4. Email Robin directly</h3>
              <p className="text-textMuted text-sm mt-2">Robin reads every message but responds in batches.</p>
              <a href="mailto:robinangel700@gmail.com?subject=NOWCOMMAND%20support" className="btn-gold mt-4 inline-flex">robinangel700@gmail.com</a>
              <p className="text-textDim text-xs font-mono mt-3">Expect a reply within 3 business days.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
