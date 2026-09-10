import { Link } from "react-router-dom";
import { HealthGuardBrand } from "../components/HealthGuardBrand";
import { PublicHeader } from "../components/PublicHeader";
import FirstAidPage from "./FirstAidPage";
import "./public-pages.css";

export default function PublicEmergencySupportPage() {
  return (
    <main className="emergency-support-public-page">
      <PublicHeader current="emergency" />
      <div className="public-emergency-directory">
        <FirstAidPage publicMode />
      </div>
      <footer className="public-emergency-footer">
        <HealthGuardBrand />
        <p>General educational information only. In immediate danger, call 112 and follow the emergency operator.</p>
        <Link to="/">Return home</Link>
      </footer>
    </main>
  );
}
