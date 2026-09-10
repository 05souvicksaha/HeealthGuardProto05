import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type ThemePreference = "light" | "dark" | "system";
type ToastTone = "success" | "info" | "warning" | "error";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  title?: string;
  leaving?: boolean;
}

interface AppState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  notify: (message: string, tone?: ToastTone, title?: string) => void;
  playFeedback: (frequency?: number) => void;
}

const AppContext = createContext<AppState | null>(null);

function readPreference(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preferences remain session-usable when storage is blocked or unavailable.
  }
}

function getStoredTheme(): ThemePreference {
  const value = readPreference("healthguard-theme");
  return value === "dark" || value === "light" ? value : "system";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(getStoredTheme);
  const [soundEnabled, setSoundEnabled] = useState(() => readPreference("healthguard-sound") === "on");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const audioContext = useRef<AudioContext | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    writePreference("healthguard-theme", next);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((value) => {
      writePreference("healthguard-sound", value ? "off" : "on");
      return !value;
    });
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.map((toast) => toast.id === id ? { ...toast, leaving: true } : toast));
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 220);
  }, []);

  const notify = useCallback((message: string, tone: ToastTone = "info", title?: string) => {
    const id = Date.now();
    setToasts((current) => {
      if (current.some((toast) => toast.message === message)) return current;
      return [...current.slice(-2), { id, message, tone, title }];
    });
    window.setTimeout(() => dismissToast(id), 4600);
  }, [dismissToast]);

  const playFeedback = useCallback(
    (frequency = 440) => {
      if (!soundEnabled) return;
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const context = audioContext.current ?? new AudioContextClass();
      audioContext.current = context;
      if (context.state === "suspended") void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.035, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.08);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.08);
    },
    [soundEnabled]
  );

  const value = useMemo(
    () => ({ theme, setTheme, soundEnabled, toggleSound, notify, playFeedback }),
    [notify, playFeedback, setTheme, soundEnabled, theme, toggleSound]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => {
          const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "warning" || toast.tone === "error" ? AlertTriangle : Info;
          const defaultTitle = toast.tone === "success" ? "Completed" : toast.tone === "error" ? "Action required" : toast.tone === "warning" ? "Please check" : "HealthGuard update";
          return <div className={`toast toast-${toast.tone}${toast.leaving ? " leaving" : ""}`} key={toast.id} role={toast.tone === "error" ? "alert" : "status"}>
            <span className="toast-icon"><Icon /></span><div className="toast-copy"><strong>{toast.title ?? defaultTitle}</strong><p>{toast.message}</p></div>
            <button type="button" aria-label="Dismiss notification" onClick={() => dismissToast(toast.id)}><X /></button><span className="toast-progress" aria-hidden="true" />
          </div>
        })}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
