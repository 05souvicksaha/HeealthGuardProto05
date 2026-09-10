---
version: alpha
colors:
  canvas: "#f5f4ef"
  publicCanvas: "#f4fbfb"
  publicSurface: "#e6f4f4"
  publicFooter: "#07152f"
  canvasDark: "#03070c"
  surface: "#ffffff"
  surfaceDark: "#09131d"
  graphite: "#101b2d"
  primary: "#4d7f82"
  primaryStrong: "#365f64"
  primarySoft: "#edf5f4"
  coral: "#ad6768"
  aubergine: "#6c3557"
  mint: "#79aa9b"
  danger: "#e23d3d"
  dangerSoft: "#fff0f0"
  warning: "#b86416"
  success: "#147b68"
  border: "#d8e3f0"
  text: "#10213a"
  muted: "#60738c"
  scrollbarTrack: "#e2e8f0"
  scrollbarThumb: "#4d7f82"
  biometricSignal: "#3f8d88"
  biometricSignalDark: "#00e676"
  biometricCyan: "#14a6b5"
  biometricViolet: "#7256c7"
typography:
  display:
    fontFamily: "\"Bahnschrift SemiCondensed\", \"Arial Narrow\", \"Segoe UI Variable Display\", sans-serif"
    fontSize: "2.5rem"
    lineHeight: "1.08"
  body:
    fontFamily: "\"Segoe UI Variable Text\", Aptos, \"Segoe UI\", sans-serif"
    fontSize: "1rem"
    lineHeight: "1.55"
  data:
    fontFamily: "\"Cascadia Code\", \"Segoe UI Variable Text\", monospace"
    fontSize: "0.875rem"
    lineHeight: "1.35"
rounded:
  control: "0.75rem"
  surface: "0.875rem"
  feature: "1.125rem"
spacing:
  xs: "0.375rem"
  sm: "0.625rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  commandShell:
    sidebarWidth: "15.375rem"
    topbarHeight: "4.625rem"
  button:
    controlHeight: "2.75rem"
    compactHeight: "2.25rem"
  panel:
    borderWidth: "1px"
    blur: "18px"
---

## Overview

HealthGuard is a connected-care workspace with a public introduction, secure onboarding, and a patient-owned operating dashboard. Its North Star is a calm clinical ledger translated into contemporary product UI: precise, source-aware, warm, and reassuring under pressure. The memorable signature is the **Care Pathway**, a four-step horizontal sequence connecting patient identity, assessment, safe action, and access to care.

Information hierarchy, accuracy, accessibility, and action clarity win over spectacle. Avoid generic SaaS gradients, cyberpunk HUDs, posed clinician stock photography, cartoon health icons, oversized decorative claims, and unearned metrics. The public and authentication surfaces use clinical daylight; the application supports a matched midnight theme without changing semantic priority. Product-context lifestyle photography may appear sparingly when it demonstrates a privacy-safe records workflow without fabricated people or data.

The supplied generated mockups established two complementary registers: a pale teal editorial landing page with generous whitespace and a darker operational dashboard built from translucent panels, condensed headings, teal/coral/aubergine/mint pathway accents, and a focused emergency action row. They are direction references, not data sources.

Token ownership uses **Model B**: runtime CSS variables in `src/styles.css` are canonical. This file mirrors their accepted values and explains intent. System token changes update both artifacts in one changeset.

## Colors

- Pale teal-white establishes the public landing canvas; ivory graph-paper and translucent white surfaces establish the authenticated clinical workspace.
- Graphite/midnight owns dark-theme navigation and high-depth surfaces.
- Muted teal denotes safe system action and connected/active state; coral, aubergine, and mint identify the care pathway without becoming status colors.
- Coral red is reserved for verified emergency actions, critical warnings, and irreversible deletion. It is not decorative.
- Amber indicates incomplete, degraded, or simulated state.
- Green indicates server-confirmed success or verified readiness.
- Decorative biometric motion uses a low-opacity clinical teal spectrum in daylight and a phosphor-green spectrum (`#00e676` to `#69f0ae`) at night. The color system creates a futuristic signal layer without communicating live health status.
- Dark theme remaps the same semantic roles to near-black midnight surfaces with restrained mint highlights, without changing information priority.

All text/action pairs must meet WCAG 2.2 AA contrast. State is never communicated by color alone.

## Typography

Segoe UI Variable/Aptos keeps the app native-feeling and deployable without a blocking font request. Display type is compact and slightly tightened. Body text is 16px at default 100% browser zoom. Utility labels are 13px minimum; metadata is 13–14px. Tabular/status data may use Cascadia Code sparingly for timestamps, identifiers, ETA, and exact counts—not for body prose.

Runtime typography ownership: `src/styles.css` defines `--font-size-xs` (.8125rem), `--font-size-sm` (.875rem), `--font-size-base` (1rem), `--font-size-md` (1.125rem), `--font-size-lg` (1.25rem), `--font-size-xl` (1.5rem), `--font-size-2xl` (1.75rem), and `--font-size-3xl` (2.25rem). Shared components and page classes consume these directly. Page headers and the dashboard greeting use `--font-size-page: clamp(2rem, 2.5vw, 2.5rem)`. Public hero type uses `--font-size-hero: clamp(2.25rem, 3.5vw, 3.75rem)`. Body and heading line heights are 1.55 and 1.15. There is no CSS zoom or page scaling.

September 2026 drift correction: older 8–12px metadata and oversized dashboard/landing headlines have been migrated to the role tokens in place. Hospital addresses, OPD times and contact numbers use the 14px metadata role. Category grids wrap before labels become crowded. Existing layout and animation families remain intact.

Avoid all-caps except small operational labels. Do not expose PII in document titles.

## Layout

Desktop uses a fixed translucent navigation rail, stable top command bar, and one document scroll owner. The dashboard is an asymmetric operational composition:

1. identity and emergency readiness;
2. Care Pathway as the spatial anchor;
3. private health readiness and source-backed care network;
4. upcoming-care empty state and Academy progress;
5. a compact HealthGuard AI handoff.

The pathway collapses from four to two and then one column as space narrows. At 860px and below, the rail becomes a focus-trapped drawer and a five-item bottom navigation keeps critical routes reachable. Supported QA widths: 375, 390, 414, 768, 1024, 1280, and 1440+.

## Elevation & Depth

Depth is a restrained seven-level system:

- 0 canvas;
- 1 data row;
- 2 static panel;
- 3 interactive panel;
- 4 sticky navigation;
- 5 popover;
- 6 modal/sheet;
- 7 emergency takeover/toast.

Glass is limited to navigation, sticky chrome, and constellation overlays. Static lists stay largely opaque. Shadows are cool, low-opacity, and paired with borders. Perspective hover is limited to 2–5 degrees on pointer-fine devices and disabled for reduced motion and touch.

## Shapes

Controls use 12px corners, product panels 14px, and feature surfaces 18px. Pills are reserved for compact status/tags; ordinary buttons and fields are not pills. Constellation nodes are circular because they encode a network, not because the system is generally rounded.

## Components

- **Public landing:** family-first value proposition, user-supplied healthcare ecosystem illustration, five source-honest capability cards, one privacy-safe records photograph, non-testimonial workflow stories, and a deep navy conversion footer. Sign Up begins registration; Login and every product exploration CTA lead to sign in.
- **Official brand lockup:** the user-supplied HealthGuard shield-and-wordmark PNG is the canonical brand asset across public, authentication, onboarding, application shell, About, and browser icon surfaces. Do not reconstruct it from icons and text.
- **Logo transparency:** the canonical 2108×648 PNG already has an alpha channel. Brand containers have no white backing in dark navigation, About, or the navy footer. Image pixels, colors, proportions and source file remain unchanged; `aspect-ratio` and `object-fit: contain` preserve geometry.
- **First Aid Guidance:** authenticated `/first-aid` sits after Ambulance in the shared Care Network navigation. The hospital directory is its sibling reference: shared page header, search/select controls, colored category filters, paginated cards and canonical modal. All 435 supplied source entries remain available. The clinical-reference notice separates imported treatment text from the general emergency-response actions. No decorative animations compete with instructions.
- **Care Pathway:** four linked actions with restrained color coding. Every step is a real, named link.
- **Emergency Action Row:** Call 112 is visually dominant, with emergency mode and hospital discovery subordinate and truthful.
- **Biometric dashboard backdrop:** one continuous, low-opacity ECG line sits in the breathing room between the greeting/action row and care cards. Closely spaced peaks, a cyan-to-violet travelling signal, phosphor glow, scan texture, and pulsing nodes create the futuristic register. Two dual-tone, node-lit DNA rails descend and rotate through the outer dashboard gutters—between the sidebar and tiles, and between the tiles and page edge. They are decorative only, never communicate health status, and cannot intercept input.
- **Global scrollbar:** every product-owned scroll surface inherits the supplied slim 4px track/thumb treatment from `src/styles.css`, with teal theme tokens, hover/active states, Firefox standards properties, and a system-owned forced-colors fallback. Component classes may change geometry only, not recolor the baseline. Deliberate exceptions are the two public landing carousels, where paired labeled arrows own navigation, and the fixed desktop navigation rail, where wheel/touch/keyboard scrolling remains native while scrollbar chrome is hidden to preserve the compact shell. The mobile drawer keeps visible scrollbar feedback.
- **Family Health Network:** patient-owned identities and relationship edges; never invent names or measurements.
- **Care Network Explorer:** source-backed hospital records with Government/Private type aliases normalized at the boundary. All 20 supplied presentation categories appear as a distinct-color specialty spectrum; category filtering resolves through the supplied category-to-specialty map, and hospital profiles repeat those colors without claiming unsupported capabilities. Distance appears only when location and calculation exist.
- **Medical Timeline Stream:** chronological, timezone-labeled events; connectors are decorative.
- **Command palette/search:** IME-safe, keyboard accessible, and scoped away from text inputs.
- **Dialog/drawer/toast:** one shared owner each, matching `UX-CONTRACT.md`.
- **Authentication suite:** clinical-daylight card, strength feedback, six-digit OTP, and truthful provider-dependent recovery states.
- **Profile setup:** a three-stage Account → Profile → Emergency flow with native date/select controls, optional private photo upload, emergency contacts, medical context, and unsaved-change protection. External-device setup is not part of this product.
- **Medical report drop:** premium drag/drop surface with real file selection, validation, progress, removal, and server-confirmed completion toast.
- **HealthGuard AI:** one assistant-only cockpit for general health navigation, care preparation, and record organisation. Risk assessment and report analysis are not advertised as AI modes; provider-unavailable responses remain honest and recoverable.
- **Academy flashcards:** the supplied reference establishes a 300×200 horizontal card rail with category accents, pointer-only tilt, shine, a 180-degree answer flip, paired arrow controls, a shuffle action, saved study progress, and visible slim scroll feedback. MCQ and scenario modes are not part of this release.
- **3D tilt:** pointer-only progressive enhancement with immediate reset on exit.

Motion communicates spatial state: 180–260ms controls, 300–420ms route/feature entrances, faster exits, and no transform choreography under reduced motion. The dashboard ECG travels on a 2.6s loop with a 2.2s ambient breath; the edge DNA rails descend on offset 8s/10s loops with a restrained 5.6s rotational turn, 4.8s scan, and softly pulsing nodes. The supplied reference did not include ECG or DNA source code, so the established project motion remains canonical while adopting its neon phosphor palette. All motion resolves to static background art when reduced motion is requested. Sound uses one shared AudioContext, requires a user gesture, is optional, and persists as a preference.

## Do's and Don'ts

Do:

- lead with source status and provider readiness;
- preserve missing values instead of inventing medical facts;
- separate deterministic triage from probabilistic condition matching;
- label simulation, stale, offline, and provider-disabled states;
- keep emergency actions reachable and keyboard-operable.

Don't:

- claim “nearby,” “live,” “24/7,” “verified,” “encrypted,” or “AI analyzed” without evidence;
- show fabricated notifications, clinicians, drivers, patients, health readings, or distances;
- let visual depth obscure text or focus;
- scatter one-off dialogs, toasts, beeps, validation, or z-index values;
- make critical workflows depend on hover, drag, animation, or sound.
