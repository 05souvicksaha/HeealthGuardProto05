import {
  Activity, Ambulance, Bell, BookOpen, Bot, BriefcaseMedical, Building2, ChevronDown, HeartPulse,
  Home, Menu, Moon, ShieldAlert, ShieldCheck, Siren, Sun, UserRound,
  Volume2, VolumeX, X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { HealthGuardBrand } from "./HealthGuardBrand";

const baseGroups = [
  { label: "Overview", items: [{ to: "/dashboard", label: "Home", icon: Home }] },
  { label: "My health", items: [{ to: "/my-health", label: "My Health", icon: Activity }, { to: "/ai", label: "HealthGuard AI", icon: Bot }] },
  { label: "Care network", items: [{ to: "/doctors", label: "Doctors", icon: UserRound }, { to: "/hospitals", label: "Hospitals", icon: Building2 }, { to: "/ambulance", label: "Ambulance", icon: Ambulance }, { to: "/first-aid", label: "First Aid Guidance", icon: BriefcaseMedical }] },
  { label: "Learn & prepare", items: [{ to: "/academy", label: "Academy", icon: BookOpen }, { to: "/emergency", label: "Emergency Center", icon: Siren }] }
];

const mobileItems = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/my-health", label: "Health", icon: HeartPulse },
  { to: "/ai", label: "Predict", icon: Bot },
  { to: "/hospitals", label: "Care", icon: Building2 },
  { to: "/emergency", label: "Emergency", icon: Siren }
];

interface NotificationPayload { items: Array<{ id: string; title: string; message: string; readAt?: string }>; unread: number }

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, setTheme, soundEnabled, toggleSound, notify } = useApp();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPayload>({ items: [], unread: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerRendered, setDrawerRendered] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const groups = useMemo(() => {
    const next = [...baseGroups];
    if (user?.role === "DRIVER") next.push({ label: "Manage", items: [{ to: "/driver", label: "Driver Operations", icon: Activity }] });
    if (user && ["ADMIN", "DEVELOPER"].includes(user.role)) next.push({ label: "Manage", items: [{ to: "/admin", label: user.role === "ADMIN" ? "Admin" : "Developer Console", icon: ShieldCheck }] });
    return next;
  }, [user]);

  useEffect(() => {
    const label = groups.flatMap((group) => group.items).find((item) => item.to === location.pathname)?.label ?? (location.pathname === "/403" ? "Access denied" : "HealthGuard");
    document.title = `${label} — HealthGuard`;
    setProfileOpen(false);
    setNotificationOpen(false);
    setDrawerOpen(false);
  }, [groups, location.pathname]);

  useEffect(() => {
    let active = true;
    api.get<NotificationPayload>("/notifications").then((value) => { if (active) setNotifications(value); }).catch(() => undefined);
    return () => { active = false; };
  }, [location.pathname]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setProfileOpen(false);
      if (noticeRef.current && !noticeRef.current.contains(event.target as Node)) setNotificationOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      setDrawerRendered(true);
      setDrawerClosing(false);
      return;
    }
    if (!drawerRendered) return;
    setDrawerClosing(true);
    const timer = window.setTimeout(() => { setDrawerRendered(false); setDrawerClosing(false); }, 190);
    return () => window.clearTimeout(timer);
  }, [drawerOpen, drawerRendered]);

  useEffect(() => {
    if (!drawerOpen || !drawerRendered) return;
    const main = document.getElementById("main-content");
    const trigger = menuRef.current;
    main?.setAttribute("inert", "");
    const focusables = drawerRef.current?.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])');
    focusables?.[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
      if (event.key !== "Tab" || !focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); main?.removeAttribute("inert"); trigger?.focus(); };
  }, [drawerOpen, drawerRendered]);

  const cycleTheme = () => {
    const next = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
    notify(`Theme set to ${next}.`);
  };
  const signOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const nav = (compact = false) => groups.map((group) => (
    <div className={`nav-group${group.label === "Overview" ? "" : " nav-group-raised"}`} key={group.label}>
      {!compact ? <span className="nav-group-label">{group.label}</span> : null}
      {group.items.map(({ to, label, icon: Icon }) => (
        <NavLink className={({ isActive }) => `nav-item${isActive ? " active" : ""}`} to={to} key={to} end={to === "/"} onClick={() => setDrawerOpen(false)}>
          <Icon aria-hidden="true" /><span>{label}</span>
        </NavLink>
      ))}
    </div>
  ));

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <HealthGuardBrand to="/dashboard" />
        <nav className="sidebar-nav">{nav()}</nav>
        <div className="readiness-card">
          <ShieldAlert aria-hidden="true" />
          <div><strong>Need help?</strong><span>Call 112 when someone is in immediate danger.</span></div>
          <NavLink to="/emergency">Open emergency center</NavLink>
        </div>
      </aside>

      <header className="topbar">
        <button ref={menuRef} className="mobile-menu icon-button" type="button" aria-label="Open menu" onClick={() => setDrawerOpen(true)}><Menu /></button>
        <HealthGuardBrand to="/dashboard" className="mobile-brand" />
        <div className="topbar-actions">
          <div className="notice-menu" ref={noticeRef}>
            <button className="icon-button notice-button" type="button" aria-label={`Notifications, ${notifications.unread} unread`} aria-expanded={notificationOpen} onClick={() => setNotificationOpen((value) => !value)}>
              <Bell />{notifications.unread ? <span aria-hidden="true">{notifications.unread > 99 ? "99+" : notifications.unread}</span> : null}
            </button>
            {notificationOpen ? <div className="notification-popover"><header><strong>Notifications</strong><small>{notifications.unread} unread</small></header>{notifications.items.length ? notifications.items.slice(0, 5).map((item) => <button type="button" key={item.id} className={item.readAt ? "" : "unread"} onClick={async () => { await api.patch(`/notifications/${item.id}/read`, {}); setNotifications((current) => ({ ...current, unread: Math.max(0, current.unread - (item.readAt ? 0 : 1)), items: current.items.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry) })); }}><strong>{item.title}</strong><span>{item.message}</span></button>) : <p>No notifications yet.</p>}</div> : null}
          </div>
          <button className="icon-button utility-hide" type="button" aria-label={`Theme preference: ${theme}. Change theme`} onClick={cycleTheme}>{theme === "dark" ? <Moon /> : <Sun />}</button>
          <button className="icon-button utility-hide" type="button" aria-label={soundEnabled ? "Turn interface sounds off" : "Turn interface sounds on"} aria-pressed={soundEnabled} onClick={toggleSound}>{soundEnabled ? <Volume2 /> : <VolumeX />}</button>
          <div className="profile-menu" ref={profileRef}>
            <button type="button" className="profile-trigger" aria-expanded={profileOpen} onClick={() => setProfileOpen((value) => !value)}>
              <span className="avatar">{user?.name?.trim().charAt(0).toUpperCase() || "H"}</span><span className="profile-copy"><strong>{user?.name}</strong><small>View profile</small></span><ChevronDown />
            </button>
            {profileOpen ? <div className="profile-popover"><NavLink to="/my-health"><UserRound />Profile & family</NavLink><NavLink to="/profile/new"><UserRound />New patient profile</NavLink><button type="button" onClick={signOut}><ShieldCheck />Sign out</button></div> : null}
          </div>
        </div>
      </header>

      {drawerRendered ? (
        <div className={`drawer-backdrop${drawerClosing ? " closing" : ""}`} onMouseDown={(event) => event.currentTarget === event.target && setDrawerOpen(false)}>
          <aside ref={drawerRef} className={`mobile-drawer${drawerClosing ? " closing" : ""}`} role="dialog" aria-modal="true" aria-label="All navigation">
            <div className="drawer-title"><span>HealthGuard destinations</span><button className="icon-button" type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu"><X /></button></div>
            <nav>{nav(true)}</nav>
          </aside>
        </div>
      ) : null}

      <main className="main-content" id="main-content">{children}</main>
      <nav className="bottom-nav" aria-label="Mobile primary navigation">
        {mobileItems.map(({ to, label, icon: Icon }) => <NavLink to={to} key={to} end={to === "/"} aria-label={label}>{({ isActive }) => <><Icon aria-hidden="true" /><span>{label}</span>{isActive ? <i aria-hidden="true" /> : null}</>}</NavLink>)}
      </nav>
    </div>
  );
}
