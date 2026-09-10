import { ShieldX } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../services/api";
import { LoadingState } from "./LoadingState";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, booting } = useAuth();
  const location = useLocation();
  if (booting) return <main className="auth-loading"><LoadingState label="Restoring your secure session…" /></main>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

export function RoleRoute({ roles, children }: { roles: AuthUser["role"][]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  if (!roles.includes(user.role)) return <ForbiddenPage required={roles.join(" or ")} />;
  return children;
}

export function ForbiddenPage({ required }: { required: string }) {
  return (
    <div className="page">
      <section className="state-panel forbidden-state">
        <ShieldX />
        <strong>Access denied</strong>
        <p>This destination requires the {required} role. Your account remains signed in and no data was exposed.</p>
        <a className="button button-primary" href="/dashboard">Return to command center</a>
      </section>
    </div>
  );
}
