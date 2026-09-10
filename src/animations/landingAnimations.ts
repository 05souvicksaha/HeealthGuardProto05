import gsap from "gsap";

export function animateLandingHero() {
  const timeline = gsap.timeline();

  timeline
    .from(".family-hero-copy h1", {
      y: 60,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
    })
    .from(
      ".family-hero-copy > p",
      {
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: "power2.out",
      },
      "-=0.45"
    )
    .from(
      ".family-hero-actions",
      {
        y: 25,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
      },
      "-=0.35"
    )
    .from(
      ".family-hero-art",
      {
        x: 60,
        opacity: 0,
        scale: 0.96,
        duration: 1,
        ease: "power3.out",
      },
      "-=0.6"
    );

  return timeline;
}