import { Home, SearchX } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return <div className="page"><div className="state-panel not-found"><SearchX /><strong>Page not found</strong><p>The destination does not exist or has moved.</p><Link className="button button-primary" to="/dashboard"><Home />Return home</Link></div></div>;
}
