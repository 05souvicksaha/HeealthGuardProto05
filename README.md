# HealthGuard V2

HealthGuard is a full-stack personal and family health workspace built directly on the supplied React project and healthcare datasets. It combines patient-owned records, secure report uploads, a source-backed hospital explorer, deterministic emergency triage, Academy learning, role-based administration, and a Socket.IO ambulance workflow in a responsive Health Operating System interface.

HealthGuard is not a diagnostic device. Call 112 when someone is in immediate danger.

## Run in VS Code on port 5500

Open this folder in VS Code and run:

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5500`. Vite serves the web app on port 5500 and proxies `/api` and Socket.IO to the API on port 4174. Use this command instead of the VS Code Live Server extension; a static server cannot run HealthGuard's authentication, uploads, database, or realtime backend.

Development-only demo accounts are created in memory mode:

| Role | Email | Password |
|---|---|---|
| User | `demo@healthguard.local` | `HealthGuard!2026` |
| Admin | `admin@healthguard.local` | `HealthGuardAdmin!2026` |
| Driver | `driver@healthguard.local` | `HealthGuardDriver!2026` |

Never enable demo accounts in production.

## Main capabilities

- Registration, six-digit email verification, login, rotating httpOnly refresh sessions, password-reset architecture, protected routes, RBAC, and ownership enforcement.
- Patient, family, history, report, medication, prescription, timeline, emergency-card, notification, and Academy progress persistence.
- Dropbox-style drag/drop report upload with extension, MIME signature, size, ownership, private-storage, download, deletion, OCR, and AI-provider boundaries.
- MongoDB/Mongoose repository plus a complete local memory mode requiring no external services.
- Idempotent imports for 108 supplied hospitals, 76 OPD schedules, 435 source protocols (414 unique IDs), and 162 flashcards.
- Repository-backed hospital, OPD, protocol, flashcard, doctor, and disease APIs.
- Deterministic red-flag triage that runs before optional AI and never fabricates provider output.
- Socket.IO authorization, request rooms, driver workflow, allowed status transitions, and an explicitly labeled simulation path.
- Admin user/role controls, allowlisted content CRUD, imports, provider readiness, validation, and privacy-safe audit logs.
- Light, dark, and system themes; reduced motion; optional interaction sound; responsive desktop rail and five-item mobile dock.
- Screenshot-matched public landing, clinical login/OTP/password screens, guided profile creation, rich success notification, and premium medical-report upload interfaces.

## Validation

```powershell
npm run verify
npm run test:e2e
npm run validate:data
```

`npm test` runs server and client tests. `npm run test:e2e` runs the authenticated Playwright journey.

## Production build

```powershell
npm run build
npm start
```

The Express process serves the production `dist` directory and API. Configure MongoDB, unique secrets, HTTPS cookie settings, and external providers before production; see [DEPLOYMENT.md](DEPLOYMENT.md).

## Documentation

- [SETUP.md](SETUP.md) — local and MongoDB setup
- [ARCHITECTURE.md](ARCHITECTURE.md) — system boundaries and flow
- [DATABASE.md](DATABASE.md) — collections, ownership, and repositories
- [API.md](API.md) — endpoint map and error contract
- [SECURITY.md](SECURITY.md) — implemented controls and residual risks
- [DATA_IMPORT.md](DATA_IMPORT.md) — normalization and idempotent import
- [AI_INTEGRATION.md](AI_INTEGRATION.md) — provider boundaries and safety order
- [REALTIME.md](REALTIME.md) — ambulance rooms, events, and transitions
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) and [MOTION_SYSTEM.md](MOTION_SYSTEM.md)
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) — honest capability matrix
