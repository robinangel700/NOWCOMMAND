import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import Shell from "@/components/Shell";
import Landing from "@/pages/Landing";
import Pricing from "@/pages/Pricing";
import Auth from "@/pages/Auth";
import About from "@/pages/About";
import CheckoutSuccess from "@/pages/CheckoutSuccess";
import Dashboard from "@/pages/Dashboard";
import { DropsList, DropDetail } from "@/pages/Drops";
import Community from "@/pages/Community";
import { NotesPage, BookmarksPage } from "@/pages/Personal";
import Affiliate from "@/pages/Affiliate";
import Billing from "@/pages/Billing";
import Admin from "@/pages/Admin";
import { BlogIndex, ArticleDetail } from "@/pages/Blog";
import { VaultIndex, VaultArticle } from "@/pages/Vault";
import { MyProfile, PublicProfile } from "@/pages/Profile";
import "@/App.css";

function Protected({ children, adminOnly = false, memberOnly = false }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="hourglass animate-glow"/></div>;
  if (!user) return <Navigate to={`/login?next=${loc.pathname}`} replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  if (memberOnly && !["full", "foundational", "admin"].includes(user.tier) && user.role !== "admin") return <Navigate to="/pricing" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/signup" element={<Auth mode="signup" />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/:slug" element={<ArticleDetail />} />
            <Route path="/checkout/success" element={<Protected><CheckoutSuccess /></Protected>} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/drops" element={<Protected memberOnly><DropsList /></Protected>} />
            <Route path="/drops/:id" element={<Protected memberOnly><DropDetail /></Protected>} />
            <Route path="/vault" element={<Protected memberOnly><VaultIndex /></Protected>} />
            <Route path="/vault/:slug" element={<Protected memberOnly><VaultArticle /></Protected>} />
            <Route path="/community" element={<Protected memberOnly><Community /></Protected>} />
            <Route path="/notes" element={<Protected memberOnly><NotesPage /></Protected>} />
            <Route path="/bookmarks" element={<Protected memberOnly><BookmarksPage /></Protected>} />
            <Route path="/affiliate" element={<Protected><Affiliate /></Protected>} />
            <Route path="/billing" element={<Protected><Billing /></Protected>} />
            <Route path="/profile" element={<Protected><MyProfile /></Protected>} />
            <Route path="/u/:id" element={<Protected memberOnly><PublicProfile /></Protected>} />
            <Route path="/admin" element={<Protected adminOnly><Admin /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Shell>
        <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: "#121212", color: "#F2EFE9", border: "1px solid #332D21", borderRadius: 0 } }} />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
