import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type AuthUser } from "../services/api";

interface AuthState {
  user: AuthUser | null;
  booting: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: { name: string; email: string; password: string; invitationToken?: string }) => Promise<{ user: AuthUser; verificationPreviewCode?: string }>;
  verifyEmail: (email: string, code: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let active = true;
    api.refresh().then((next) => { if (active) setUser(next.emailVerified ? next : null); }).catch(() => undefined).finally(() => { if (active) setBooting(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!("BroadcastChannel" in window)) return;
    const channel = new BroadcastChannel("healthguard-auth");
    channel.onmessage = (event) => { if (event.data === "logout") setUser(null); };
    return () => channel.close();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await api.login({ email, password });
    setUser(next.emailVerified ? next : null);
    return next;
  }, []);
  const register = useCallback(async (input: { name: string; email: string; password: string; invitationToken?: string }) => {
    return api.register(input);
  }, []);
  const verifyEmail = useCallback(async (email: string, code: string) => {
    await api.post("/auth/verify-email", { email, code });
    const next = await api.refresh();
    setUser(next);
    return next;
  }, []);
  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel("healthguard-auth");
      channel.postMessage("logout");
      channel.close();
    }
  }, []);

  const value = useMemo(() => ({ user, booting, login, register, verifyEmail, logout }), [booting, login, logout, register, user, verifyEmail]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
