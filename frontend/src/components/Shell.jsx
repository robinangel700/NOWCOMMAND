import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Crown, LogOut, Menu, X, Compass, Users, BookOpen, Bookmark, Sparkles, Settings as SettingsIcon, CreditCard, Hourglass } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function Shell({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === "admin";
  const isMember = user?.tier === "full" || user?.tier === "foundational" || isAdmin;

  const memberLinks = [
    { to: "/dashboard", label: "Dashboard", icon: Compass },
    { to: "/drops", label: "Drops", icon: Sparkles },
    { to: "/vault", label: "Vault", icon: BookOpen },
    { to: "/community", label: "Community", icon: Users },
    { to: "/notes", label: "Notes", icon: BookOpen },
    { to: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    { to: "/affiliate", label: "Affiliate", icon: Crown },
    { to: "/billing", label: "Billing", icon: CreditCard },
    { to: "/profile", label: "Profile", icon: Compass },
  ];
  const adminLink = { to: "/admin", label: "Admin", icon: SettingsIcon };
  const links = isMember ? (isAdmin ? [...memberLinks, adminLink] : memberLinks) : [];

  return (
    <div className="App grain min-h-screen">
      <nav className="fixed top-0 inset-x-0 z-50 bg-void/90 backdrop-blur-md border-b border-borderGold">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-16">
          <Link to="/" data-testid="brand-link" className="flex items-center gap-3 group">
            <Hourglass className="w-5 h-5 text-gold group-hover:rotate-180 transition-transform duration-700" />
            <span className="font-display text-2xl tracking-tight text-cream group-hover:text-gold transition-colors">NOWREALM</span>
            <span className="hidden md:inline overline text-[10px] tracking-[0.4em] ml-2">// ROBIN ANGEL</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {user ? (
              <>
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    data-testid={`nav-${l.label.toLowerCase()}`}
                    className={`px-4 py-2 text-xs tracking-[0.2em] uppercase font-mono transition-colors ${
                      loc.pathname.startsWith(l.to) ? "text-gold" : "text-textMuted hover:text-cream"
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
                <button
                  data-testid="logout-button"
                  onClick={() => { logout(); nav("/"); }}
                  className="ml-3 text-textMuted hover:text-gold flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-mono"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/blog" data-testid="nav-blog" className="px-4 py-2 text-xs tracking-[0.2em] uppercase font-mono text-textMuted hover:text-cream">Blog</Link>
                <Link to="/about" data-testid="nav-about" className="px-4 py-2 text-xs tracking-[0.2em] uppercase font-mono text-textMuted hover:text-cream">Manifesto</Link>
                <Link to="/pricing" data-testid="nav-pricing" className="px-4 py-2 text-xs tracking-[0.2em] uppercase font-mono text-textMuted hover:text-cream">Pricing</Link>
                <Link to="/login" data-testid="nav-login" className="px-4 py-2 text-xs tracking-[0.2em] uppercase font-mono text-textMuted hover:text-cream">Sign in</Link>
                <Link to="/pricing" data-testid="nav-cta" className="btn-gold ml-2 text-xs py-2.5 px-5">Claim a seat</Link>
              </>
            )}
          </div>
          <button data-testid="mobile-menu-toggle" className="md:hidden text-cream" onClick={() => setOpen(!open)}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t border-borderGold bg-void">
            <div className="px-6 py-4 flex flex-col gap-3">
              {user ? (
                <>
                  {links.map((l) => (
                    <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-textMuted hover:text-gold text-sm font-mono uppercase tracking-[0.2em]">{l.label}</Link>
                  ))}
                  <button data-testid="mobile-logout" onClick={() => { logout(); nav("/"); setOpen(false); }} className="text-left text-textMuted hover:text-gold text-sm font-mono uppercase tracking-[0.2em]">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/blog" onClick={() => setOpen(false)} className="text-textMuted hover:text-gold text-sm font-mono uppercase tracking-[0.2em]">Blog</Link>
                  <Link to="/about" onClick={() => setOpen(false)} className="text-textMuted hover:text-gold text-sm font-mono uppercase tracking-[0.2em]">Manifesto</Link>
                  <Link to="/pricing" onClick={() => setOpen(false)} className="text-textMuted hover:text-gold text-sm font-mono uppercase tracking-[0.2em]">Pricing</Link>
                  <Link to="/login" onClick={() => setOpen(false)} className="text-textMuted hover:text-gold text-sm font-mono uppercase tracking-[0.2em]">Sign in</Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
      <main className="pt-16 relative z-10">{children}</main>
      <footer className="border-t border-borderGold mt-32 py-12 px-6 lg:px-10 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-3">
            <Hourglass className="w-4 h-4 text-gold" />
            <span className="font-display text-xl text-cream">NOWREALM</span>
            <span className="overline text-[10px]">// Robin Angel</span>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-textDim">Cast out Mammon. Rule the Increase. Operate in Kairos.</p>
        </div>
      </footer>
    </div>
  );
}
