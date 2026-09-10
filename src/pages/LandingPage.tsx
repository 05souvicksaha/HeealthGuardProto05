import {
  ArrowLeft,
  ArrowRight,
  Asterisk,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  FileHeart,
  Hospital,
  ShieldCheck,
  Siren,
  UsersRound
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { HealthGuardBrand } from "../components/HealthGuardBrand";

const platformFeatures = [
  {
    icon: FileHeart,
    title: "My Health",
    copy: "Profiles, family records, medical history, reports, prescriptions, medications, and a clear timeline—all in one place."
  },
  {
    icon: BrainCircuit,
    title: "HealthGuard AI",
    copy: "A focused health assistant for care preparation, record organisation, and next-step questions—with clear limits."
  },
  {
    icon: Hospital,
    title: "Care Network",
    copy: "Discover source-backed hospitals, OPD schedules, doctors, and ambulance coordination without invented availability."
  },
  {
    icon: Siren,
    title: "Emergency Center",
    copy: "Keep emergency numbers, first-aid guidance, ambulance requests, and emergency hospital information close at hand."
  },
  {
    icon: BookOpen,
    title: "Academy",
    copy: "Build practical readiness with interactive source-backed flashcards and saved learning progress."
  }
] as const;

const workflowStories = [
  {
    title: "One family workspace",
    copy: "Keep each family member's records separated, organized, and available from one patient-owned account."
  },
  {
    title: "Guidance with clear limits",
    copy: "Review warning signs and first-aid steps without confusing guidance with a clinical diagnosis."
  },
  {
    title: "Care details that stay honest",
    copy: "See source-backed hospital and OPD information without fabricated distance, availability, or provider claims."
  },
  {
    title: "Prepared when it matters",
    copy: "Store essential contacts and medical context so critical information is easier to reach under pressure."
  }
] as const;

export function LandingPage() {
  const featureRailRef = useRef<HTMLDivElement>(null);
  const storyRailRef = useRef<HTMLDivElement>(null);
  const [featureIndex, setFeatureIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);

  useEffect(() => {
  document.title = "Family health, organised — HealthGuard";
}, []);

  const scrollRail = (
    rail: HTMLDivElement | null,
    direction: -1 | 1,
    updateIndex: (value: number) => void,
    currentIndex: number,
    maximumIndex: number
  ) => {
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>("article");
    const step = card ? card.offsetWidth + 18 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: step * direction, behavior: "smooth" });
    updateIndex(Math.min(maximumIndex, Math.max(0, currentIndex + direction)));
  };

  return (
    <main className="family-landing">
      <header className="family-header">
        <HealthGuardBrand />
        <nav aria-label="Account navigation">
          <Link className="family-signup-link" to="/register">Sign Up</Link>
          <Link className="family-login-link" to="/login">
            <ShieldCheck aria-hidden="true" /> Login <ChevronDown aria-hidden="true" />
          </Link>
        </nav>
      </header>

      <section className="family-hero" aria-labelledby="family-hero-title">
        <div className="family-hero-copy">
          <h1 id="family-hero-title">Your Family's<br />Health, Organised,<br />Understood, And<br />Protected</h1>
          <p>HealthGuard brings personal and family health records, care discovery, emergency intelligence, and health education together in one secure, AI-assisted platform.</p>
          <div className="family-hero-actions">
            <Link className="family-button family-button-primary" to="/login">Explore the platform <ArrowRight aria-hidden="true" /></Link>
            <Link className="family-button family-button-secondary" to="/emergency-support">Emergency support</Link>
          </div>
        </div>
        <div className="family-hero-art">
          <img src="/assets/landing-health-ecosystem.png" alt="Connected health tools including a hospital, ambulance, first-aid kit, stethoscope, and mobile health app" />
        </div>
      </section>
    
      <section className="family-platform" aria-labelledby="family-platform-title">
        <div className="family-section-intro family-section-intro-centered">
          <span><ShieldCheck aria-hidden="true" /> What HealthGuard does</span>
          <h2 id="family-platform-title">One Platform For Your Whole<br />Family's Health</h2>
          <p>Five connected pillars keep your records, your care, and your learning in one secure place.</p>
        </div>

        <div className="family-slider-shell">
          <button
            type="button"
            className="family-slider-arrow family-slider-arrow-left"
            aria-label="Show previous platform feature"
            disabled={featureIndex === 0}
            onClick={() => scrollRail(featureRailRef.current, -1, setFeatureIndex, featureIndex, platformFeatures.length - 1)}
          ><ArrowLeft aria-hidden="true" /></button>
          <div className="family-feature-rail" ref={featureRailRef}>
            {platformFeatures.map(({ icon: Icon, title, copy }) => (
              <article className="family-feature-card" key={title}>
                <span className="family-feature-icon"><Icon aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          <button
            type="button"
            className="family-slider-arrow family-slider-arrow-right"
            aria-label="Show next platform feature"
            disabled={featureIndex === platformFeatures.length - 1}
            onClick={() => scrollRail(featureRailRef.current, 1, setFeatureIndex, featureIndex, platformFeatures.length - 1)}
          ><ArrowRight aria-hidden="true" /></button>
        </div>
        <div className="family-slider-dots" aria-hidden="true">
  <i className={featureIndex <= 1 ? "active" : ""} />
  <i className={featureIndex > 1 ? "active" : ""} />
</div>
      </section>

      <section className="family-records" aria-labelledby="family-records-title">
        <div className="family-records-copy">
          <span className="family-kicker"><FileHeart aria-hidden="true" /> My Health</span>
          <h2 id="family-records-title">Every Record, Every<br />Family Member,<br />One Timeline</h2>
          <p>Manage patient profiles for yourself and your family, upload and analyze medical reports, track prescriptions and medications, and follow a clear medical timeline—all in one secure workspace.</p>
          <ul>
            <li><CheckCircle2 aria-hidden="true" /> Patient profiles for the whole family</li>
            <li><CheckCircle2 aria-hidden="true" /> Medical reports, prescriptions, and medications</li>
            <li><CheckCircle2 aria-hidden="true" /> A clear medical timeline of every saved event</li>
          </ul>
          <Link className="family-button family-button-secondary" to="/login">Explore my health</Link>
        </div>
        <div className="family-records-image">
          <img src="/assets/landing-tablet-records.webp" alt="A person reviewing a private health dashboard on a tablet" />
        </div>
      </section>

      <section className="family-stories" aria-labelledby="family-stories-title">
        <div className="family-stories-heading">
          <div>
            <span className="family-kicker"><UsersRound aria-hidden="true" /> Family workflows</span>
            <h2 id="family-stories-title">Health In One Place,<br />Without The Guesswork</h2>
          </div>
          <p>HealthGuard connects the everyday jobs families need to do while keeping source status, ownership, and safety boundaries visible.</p>
        </div>
        <div className="family-story-rail" ref={storyRailRef}>
          {workflowStories.map(({ title, copy }) => (
            <article className="family-story-card" key={title}>
              <p>{copy}</p>
              <div><span><UsersRound aria-hidden="true" /></span><strong>{title}</strong><small>HealthGuard capability</small></div>
            </article>
          ))}
        </div>
        <div className="family-story-controls">
          <span className="family-story-progress" aria-hidden="true"><i style={{ width: `${((storyIndex + 1) / workflowStories.length) * 100}%` }} /></span>
          <div>
            <button type="button" aria-label="Show previous family workflow" disabled={storyIndex === 0} onClick={() => scrollRail(storyRailRef.current, -1, setStoryIndex, storyIndex, workflowStories.length - 1)}><ArrowLeft aria-hidden="true" /></button>
            <button type="button" aria-label="Show next family workflow" disabled={storyIndex === workflowStories.length - 1} onClick={() => scrollRail(storyRailRef.current, 1, setStoryIndex, storyIndex, workflowStories.length - 1)}><ArrowRight aria-hidden="true" /></button>
          </div>
        </div>
      </section>

      <footer className="family-footer">
        <div className="family-footer-top">
          <HealthGuardBrand />
          <div className="family-footer-cta">
            <h2>Take control of your family's health</h2>
            <p>Secure records, trusted care, and emergency support—all in one platform.</p>
            <Link className="family-footer-button" to="/login">Get started <ArrowRight aria-hidden="true" /></Link>
          </div>
        </div>
        <div className="family-footer-links">
          <div><h3>Platform</h3><Link to="/login">Care Network</Link><Link to="/emergency-support">Emergency</Link><Link to="/login">Academy</Link><Link to="/about">About</Link></div>
          <div><h3>Care</h3><Link to="/login">Hospitals</Link><Link to="/login">Doctors</Link><Link to="/login">Ambulance</Link><Link to="/login">OPD Schedules</Link><Link to="/login">Emergency Care</Link></div>
          <div><h3>Support</h3><Link to="/emergency-support">First Aid</Link><Link to="/emergency-support">Emergency Numbers</Link></div>
        </div>
        <div className="family-footer-bottom">
          <p>© 2026 HealthGuard. All rights reserved.</p>
        </div>
        <Asterisk className="family-footer-mark" aria-hidden="true" />
      </footer>
    </main>
  );
}
