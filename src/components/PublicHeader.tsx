import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { HealthGuardBrand } from "./HealthGuardBrand";

export function PublicHeader({ current }: { current: "about" | "emergency" }) {
  return (
    <header className="public-page-header">
      <HealthGuardBrand />
      <nav aria-label="Public navigation">
        <Link className="public-page-home" to="/"><ArrowLeft aria-hidden="true" /> Home</Link>
        {current === "about"
          ? <Link to="/emergency-support">Emergency support</Link>
          : <Link to="/about">About</Link>}
        <Link className="public-page-login" to="/login"><ShieldCheck aria-hidden="true" /> Log in</Link>
      </nav>
    </header>
  );
}
