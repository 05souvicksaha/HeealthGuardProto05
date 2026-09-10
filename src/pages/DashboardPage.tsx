import {
  ArrowRight, Bot, Building2, GraduationCap, CalendarDays, ClipboardCheck,
  HeartPulse, Phone, Search, Send, ShieldCheck, UserRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LoadingState } from "../components/LoadingState";
import { useAuth } from "../context/AuthContext";
import { useHealthData } from "../context/DataContext";
import { api } from "../services/api";
import { hospitalTypeLabel } from "../utils/hospitals";

interface Collection<T> { items: T[]; total: number }
interface RecordItem {
  id: string;
  name?: string;
  title?: string;
  bloodGroup?: string;
  allergies?: string[];
  updatedAt?: string;
}
interface DashboardSnapshot {
  patients: Collection<RecordItem>;
  reports: Collection<RecordItem>;
  medications: Collection<RecordItem>;
  progress: Collection<RecordItem>;
}

const careSteps = [
  { icon: UserRound, title: "Patient", copy: "You and your family", to: "/my-health" },
  { icon: Search, title: "Ask", copy: "Navigate health questions", to: "/ai" },
  { icon: ShieldCheck, title: "Act", copy: "Use approved guidance", to: "/emergency" },
  { icon: ClipboardCheck, title: "Reach care", copy: "Connect to the right care", to: "/hospitals" }
] as const;

const heartbeatPath = [
  "M0 110 H38 L50 110 L62 94 L74 128 L88 110 H112 L126 110 L138 66 L154 156 L172 82 L190 136 L208 110",
  "H244 L256 110 L268 97 L280 124 L294 110 H318 L332 110 L344 70 L360 152 L378 84 L396 133 L414 110",
  "H450 L462 110 L474 92 L486 129 L500 110 H524 L538 110 L550 62 L566 160 L584 79 L602 138 L620 110",
  "H656 L668 110 L680 96 L692 125 L706 110 H730 L744 110 L756 68 L772 154 L790 83 L808 134 L826 110",
  "H862 L874 110 L886 93 L898 129 L912 110 H936 L950 110 L962 64 L978 158 L996 80 L1014 137 L1032 110",
  "H1068 L1080 110 L1092 97 L1104 124 L1118 110 H1142 L1156 110 L1168 69 L1184 153 L1202 84 L1220 133 L1238 110",
  "H1274 L1286 110 L1298 92 L1310 129 L1324 110 H1348 L1362 110 L1374 63 L1390 159 L1408 80 L1426 137 L1444 110",
  "H1480 L1492 110 L1504 96 L1516 125 L1530 110 H1554 L1568 110 L1580 72 L1594 148 L1600 110"
].join(" ");
const dnaSegmentKeys = [0, 1, 2, 3, 4, 5] as const;

function DashboardDnaSegment() {
  return (
    <svg className="dashboard-dna-segment" viewBox="0 0 70 360" preserveAspectRatio="none" focusable="false">
      <path className="dashboard-dna-axis" d="M35 0 V360" />
      <path className="dashboard-dna-curve dashboard-dna-curve-primary" d="M12 0 C58 30 58 60 12 90 C-4 120 -4 150 12 180 C58 210 58 240 12 270 C-4 300 -4 330 12 360" />
      <path className="dashboard-dna-curve dashboard-dna-curve-secondary" d="M58 0 C12 30 12 60 58 90 C74 120 74 150 58 180 C12 210 12 240 58 270 C74 300 74 330 58 360" />
      <g className="dashboard-dna-rungs">
        <path d="M23 14 H47" /><path d="M32 31 H38" /><path d="M26 48 H44" /><path d="M17 66 H53" />
        <path d="M18 104 H52" /><path d="M27 122 H43" /><path d="M32 139 H38" /><path d="M22 157 H48" />
        <path d="M23 194 H47" /><path d="M32 211 H38" /><path d="M26 228 H44" /><path d="M17 246 H53" />
        <path d="M18 284 H52" /><path d="M27 302 H43" /><path d="M32 319 H38" /><path d="M22 337 H48" />
      </g>
      <g className="dashboard-dna-nodes">
        <circle cx="23" cy="14" r="2.6" /><circle cx="47" cy="14" r="2.6" />
        <circle cx="17" cy="66" r="2.2" /><circle cx="53" cy="66" r="2.2" />
        <circle cx="18" cy="104" r="2.6" /><circle cx="52" cy="104" r="2.6" />
        <circle cx="22" cy="157" r="2.2" /><circle cx="48" cy="157" r="2.2" />
        <circle cx="23" cy="194" r="2.6" /><circle cx="47" cy="194" r="2.6" />
        <circle cx="17" cy="246" r="2.2" /><circle cx="53" cy="246" r="2.2" />
        <circle cx="18" cy="284" r="2.6" /><circle cx="52" cy="284" r="2.6" />
        <circle cx="22" cy="337" r="2.2" /><circle cx="48" cy="337" r="2.2" />
      </g>
    </svg>
  );
}

function DashboardDnaRail({ side }: { side: "left" | "right" }) {
  return (
    <span className={`dashboard-edge-dna-rail dashboard-edge-dna-${side}`}>
      <span className="dashboard-edge-dna-track">
        {dnaSegmentKeys.map((key) => <DashboardDnaSegment key={key} />)}
      </span>
    </span>
  );
}

function DashboardEdgeDna() {
  return (
    <div className="dashboard-edge-dna" aria-hidden="true">
      <DashboardDnaRail side="left" />
      <DashboardDnaRail side="right" />
    </div>
  );
}

function DashboardHeartbeatBackdrop() {
  return (
    <div className="dashboard-biometric-backdrop" aria-hidden="true">
      <svg className="dashboard-heartbeat" viewBox="0 0 1600 220" preserveAspectRatio="none" focusable="false">
        <defs>
          <linearGradient id="dashboard-heartbeat-spectrum" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--biometric-cyan)" stopOpacity=".15" />
            <stop offset=".22" stopColor="var(--biometric-cyan)" />
            <stop offset=".52" stopColor="var(--biometric-signal-soft)" />
            <stop offset=".78" stopColor="var(--biometric-violet)" />
            <stop offset="1" stopColor="var(--biometric-violet)" stopOpacity=".15" />
          </linearGradient>
        </defs>
        <path className="dashboard-heartbeat-track" d={heartbeatPath} pathLength="1" />
        <path className="dashboard-heartbeat-glow" d={heartbeatPath} pathLength="1" />
        <path className="dashboard-heartbeat-flow" d={heartbeatPath} pathLength="1" />
        <g className="dashboard-heartbeat-nodes">
          <circle cx="154" cy="156" r="4" /><circle cx="566" cy="160" r="4" />
          <circle cx="978" cy="158" r="4" /><circle cx="1390" cy="159" r="4" />
        </g>
      </svg>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data, loading: dataLoading, error: dataError, retry } = useHealthData();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [snapshotError, setSnapshotError] = useState("");
  const [question, setQuestion] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get<Collection<RecordItem>>("/patients", controller.signal),
      api.get<Collection<RecordItem>>("/reports", controller.signal),
      api.get<Collection<RecordItem>>("/medications", controller.signal),
      api.get<Collection<RecordItem>>("/progress", controller.signal)
    ]).then(([patients, reports, medications, progress]) => setSnapshot({ patients, reports, medications, progress }))
      .catch((nextError) => {
        if (nextError instanceof DOMException && nextError.name === "AbortError") return;
        setSnapshotError("Your private health summary could not be loaded.");
      });
    return () => controller.abort();
  }, []);

  const hospitals = useMemo(() => data?.hospitals.slice(0, 2) ?? [], [data]);
  const patient = snapshot?.patients.items[0];
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
  const profileReady = Boolean(patient?.name && patient?.bloodGroup);

  const ask = (event: React.FormEvent) => {
    event.preventDefault();
    const next = question.trim();
    if (!next) return;
    navigate(`/ai?q=${encodeURIComponent(next)}`);
  };

  return (
    <div className="dashboard-v3">
      <DashboardEdgeDna />
      {(dataError || snapshotError) ? (
        <div className="connectivity-banner" role="alert"><span>{dataError || snapshotError}</span><button type="button" onClick={retry}>Retry</button></div>
      ) : null}

      <section className="dashboard-greeting">
        <DashboardHeartbeatBackdrop />
        <div className="dashboard-greeting-copy"><h1>Welcome, {firstName}</h1><p>Your health, connected.</p></div>
        <span className="dashboard-greeting-gap" aria-hidden="true" />
        <div className="dashboard-urgent-actions">
          <a className="urgent-action call" href="tel:112"><Phone /><span><strong>Call 112</strong><small>Immediate help</small></span></a>
          <Link className="urgent-action mode" to="/emergency"><HeartPulse /><span><strong>Emergency mode</strong><small>I need urgent help</small></span></Link>
          <Link className="urgent-action hospital" to="/hospitals?emergency=true"><Building2 /><span><strong>Find hospital</strong><small>Source-listed care</small></span></Link>
        </div>
      </section>

      <div className="dashboard-v3-grid">
        <section className="hg-panel care-pathway-panel">
          <header><h2>Care pathway</h2><Link to="/ai">Start assessment <ArrowRight /></Link></header>
          <ol className="care-pathway">
            {careSteps.map(({ icon: Icon, title, copy, to }, index) => (
              <li key={title}>
                <Link to={to}><span className={`pathway-orb pathway-${index + 1}`}><Icon /></span><strong>{title}</strong><small>{copy}</small></Link>
                {index < careSteps.length - 1 ? <ArrowRight className="pathway-arrow" aria-hidden="true" /> : null}
              </li>
            ))}
          </ol>
        </section>

        <section className="hg-panel health-summary-panel">
          <header><h2>My health</h2><Link to="/my-health">View all</Link></header>
          {!snapshot ? <LoadingState label="Loading your health summary…" /> : (
            <div className="health-summary-body">
              <ul>
                <li><span className="summary-dot teal"><HeartPulse /></span><div><small>Patient profile</small><strong>{patient?.name ?? "Not created"}</strong></div></li>
                <li><span className="summary-dot blue"><ShieldCheck /></span><div><small>Emergency setup</small><strong>{profileReady ? "Core details added" : "Setup incomplete"}</strong></div></li>
                <li><span className="summary-dot coral"><ClipboardCheck /></span><div><small>Records</small><strong>{snapshot.reports.total} reports · {snapshot.medications.total} medications</strong></div></li>
              </ul>
            </div>
          )}
          <Link className="panel-inline-link" to={patient ? "/my-health" : "/profile/new"}>{patient ? "Review health profile" : "Complete health profile"} <ArrowRight /></Link>
        </section>

        <section className="hg-panel hospital-preview-panel">
          <header><h2>Care network</h2><Link to="/hospitals">View all</Link></header>
          {dataLoading ? <LoadingState label="Loading hospital directory…" /> : (
            <div className="hospital-preview-list">
              {hospitals.map((hospital) => {
                const schedule = data?.opd[hospital.name];
                return (
                  <Link to={`/hospitals?q=${encodeURIComponent(hospital.name)}`} key={hospital.name}>
                    <span className="hospital-preview-icon"><Building2 /></span>
                    <span className="hospital-preview-copy"><strong>{hospital.name}</strong><small>{hospital.address}</small></span>
                    <span className={`hospital-capability${hospital.emergency ? " emergency" : ""}`}>{hospital.emergency ? "Emergency listed" : "General care"}</span>
                    <span className="hospital-hours"><b>{hospitalTypeLabel(hospital.type)}</b><small>{schedule?.weekday || "Hours not listed"}</small></span>
                    <ArrowRight />
                  </Link>
                );
              })}
            </div>
          )}
          <p className="panel-source-note">Ordered from the supplied directory. Distance is not shown without location permission and a verified calculation.</p>
        </section>

        <section className="hg-panel upcoming-panel">
          <header><h2>Upcoming care</h2><Link to="/my-health?tab=timeline">View all</Link></header>
          <div className="upcoming-empty"><span><CalendarDays /></span><div><strong>No verified appointments connected</strong><p>Add care events to your private timeline.</p></div></div>
          <div className="timeline-track" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <i key={index} />)}</div>
          <Link className="button button-outline button-small" to="/my-health?tab=timeline">Open timeline</Link>
        </section>

        <section className="hg-panel academy-panel">
          <header><h2>Academy</h2><Link to="/academy">View all</Link></header>
          <div className="academy-body">
            <div className="academy-art">
  <GraduationCap aria-hidden="true" />
</div>
            <div><small>Continue learning</small><strong>Emergency essentials</strong><div className="academy-progress"><span style={{ width: `${Math.min(100, Math.round(((snapshot?.progress.total ?? 0) / Math.max(1, data?.flashcards.length ?? 1)) * 100))}%` }} /></div><p>{snapshot?.progress.total ?? 0} studied from {data?.flashcards.length ?? 0} source-backed flashcards</p></div>
          </div>
        </section>

        <section className="hg-panel ask-panel">
          <header><h2>Ask HealthGuard AI</h2></header>
          <form onSubmit={ask} noValidate>
            <span className="ask-avatar"><Bot /></span>
            <label className="sr-only" htmlFor="dashboard-ai-question">Ask HealthGuard AI</label>
            <input id="dashboard-ai-question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }} placeholder="How can I help you today?" />
            {question ? <button type="button" className="ask-clear" aria-label="Clear question" onClick={() => setQuestion("")}>Clear</button> : null}
            <button type="submit" aria-label="Open HealthGuard AI with this question" disabled={!question.trim()}><Send /></button>
          </form>
          <p>Ask the configured assistant about care preparation, health records, and next steps.</p>
        </section>
      </div>
    </div>
  );
}
