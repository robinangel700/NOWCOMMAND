import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch (e) {
      console.error("Auth refresh failed", e);
      setUser(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    // Auth cookie is set by the server (httpOnly). Do not store token in localStorage.
    setUser(data.user);
    return data.user;
  };
  const signup = async (email, password, name, ref) => {
    const payload = { email, password, name };
    if (ref) payload.ref = ref;
    const { data } = await api.post("/auth/signup", payload);
    // Server sets httpOnly cookie on signup.
    setUser(data.user);
    return data.user;
  };
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) { console.error("Logout failed", e); }
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
