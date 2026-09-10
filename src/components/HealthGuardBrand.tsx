import { Link } from "react-router-dom";

export function HealthGuardBrand({ to = "/", className = "" }: { to?: string; className?: string }) {
  return (
    <Link className={`brand healthguard-brand ${className}`.trim()} to={to} aria-label="HealthGuard home">
      <img className="healthguard-logo" src="/assets/healthguard-logo.png" alt="" />
    </Link>
  );
}
