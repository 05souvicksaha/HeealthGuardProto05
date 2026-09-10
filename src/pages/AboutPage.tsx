import { Braces, HeartPulse, UserRound } from "lucide-react";
import { useEffect, type CSSProperties } from "react";
import { PublicHeader } from "../components/PublicHeader";
import "./public-pages.css";

const teamMembers = [
  { name: "Ankurak Roy", photo: "/assets/developer-ankurak-roy.jpeg", position: "50% 30%", scale: 1.12 },
  { name: "Kinjal Pramanik", photo: "/assets/developer-kinjal-pramanik.jpeg", position: "50% 45%", scale: 1.1 },
  { name: "Souvick Saha", photo: "/assets/developer-souvick-saha.jpeg", position: "50% 42%", scale: 1.06 },
  { name: "Aryan Chowdhury", photo: "/assets/developer-aryan-chowdhury.jpeg", position: "50% 36%", scale: 1.08 },
  { name: "Sampad Chakraborty", photo: "/assets/developer-sampad-chakraborty.jpeg", position: "48% 38%", scale: 1.08 },
  { name: "Sneha Sarkar", photo: "/assets/developer-sneha-sarkar.jpeg", position: "50% 34%", scale: 1.04 },
] as const;

export function AboutPage() {
  useEffect(() => { document.title = "Our developer team — HealthGuard"; }, []);

  return (
    <main className="about-public-page">
      <PublicHeader current="about" />
      <div className="about-public-atmosphere" aria-hidden="true"><HeartPulse /><Braces /></div>
      <section className="about-team" aria-labelledby="developer-team-title">
        <header className="about-team-heading">
          <span>Built with care</span>
          <h1 id="developer-team-title">The people behind HealthGuard</h1>
          <p>Six developers bringing health records, care discovery, emergency guidance, and practical learning into one connected platform.</p>
        </header>
        <div className="about-team-grid">
          {teamMembers.map((member, index) => (
            <article className="about-developer-card" key={member.name} aria-label={`${member.name} developer profile`}>
              <div className="about-developer-photo-frame">
                <div className="about-developer-photo-crop">
                  <img
                    className="about-developer-portrait"
                    src={member.photo}
                    alt={`${member.name} portrait`}
                    width="176"
                    height="176"
                    loading={index < 2 ? "eager" : "lazy"}
                    decoding="async"
                    style={{
                      objectPosition: member.position,
                      "--portrait-scale": member.scale,
                    } as CSSProperties}
                  />
                </div>
              </div>
              <div className="about-developer-copy">
                <span><UserRound aria-hidden="true" /> Developer</span>
                <h2>{member.name}</h2>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
