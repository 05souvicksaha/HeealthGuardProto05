import { Ambulance, ArrowRight, BriefcaseMedical, Building2, MapPin, Phone, Search, ShieldAlert, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useHealthData } from "../context/DataContext";

export function EmergencyPage() {
  const { data } = useHealthData();
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return data?.protocols.filter((item) => item.sev === "critical").slice(0, 4) ?? [];
    return data?.protocols.filter((item) => `${item.title} ${item.tags.join(" ")}`.toLowerCase().includes(needle)).slice(0, 5) ?? [];
  }, [data, query]);

  return (
    <div className="page emergency-page">
      <header className="emergency-header"><span className="emergency-logo"><ShieldAlert /></span><div><h1>Emergency center</h1><p>Fast actions first. If someone is in immediate danger, call 112.</p></div></header>
      <section className="emergency-command-grid">
        <a href="tel:112" className="emergency-command primary"><Phone /><span><strong>Call 112</strong><small>National emergency number</small></span><ArrowRight /></a>
        <Link to="/ambulance" className="emergency-command"><Ambulance /><span><strong>Request ambulance</strong><small>Open dispatch workflow</small></span><ArrowRight /></Link>
        <Link to="/hospitals?emergency=true" className="emergency-command"><Building2 /><span><strong>Find emergency hospital</strong><small>Filter supplied hospital records</small></span><ArrowRight /></Link>
        <Link to="/first-aid" className="emergency-command"><BriefcaseMedical /><span><strong>First-aid guidance</strong><small>Browse the reference library</small></span><ArrowRight /></Link>
      </section>
      <div className="emergency-content-grid">
        <section className="first-aid-panel panel" id="first-aid">
          <div className="panel-heading"><div><h2>First-aid guidance</h2><p>Search symptoms or a condition.</p></div></div>
          <div className="search-field emergency-search"><Search /><label className="sr-only" htmlFor="protocol-search">Search first-aid protocols</label><input id="protocol-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Chest pain, choking, burns…" /></div>
          <div className="protocol-short-list">{matches.map((protocol) => <Link to={`/first-aid?q=${encodeURIComponent(protocol.title)}`} key={protocol.id}><span className={`severity-dot ${protocol.sev}`} /><span><strong>{protocol.title}</strong><small>{protocol.cat} · {protocol.sev} risk protocol</small></span><ArrowRight /></Link>)}</div>
        </section>
        <aside className="emergency-side">
          <section className="panel"><div className="panel-heading"><h2>Emergency contacts</h2></div><a className="number-row" href="tel:112"><span><Phone /></span><div><small>National emergency</small><strong>112</strong></div></a><p className="source-warning">Only the emergency number explicitly supplied in the specification is shown.</p></section>
          <section className="panel"><div className="panel-heading"><h2>Emergency profile</h2></div><div className="profile-readiness"><UserRound /><div><strong>Kinjal Pramanik</strong><span>Emergency card incomplete</span></div></div><Link className="button button-outline button-wide" to="/my-health">Complete health card</Link></section>
          <section className="panel location-permission"><MapPin /><div><strong>Location is off</strong><p>HealthGuard asks for location only when you choose “Use location” during an ambulance request.</p></div></section>
        </aside>
      </div>
    </div>
  );
}
