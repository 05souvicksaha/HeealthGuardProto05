import {
  ArrowLeft, ArrowRight, Check, Eye, EyeOff, KeyRound, LockKeyhole, Mail, MailCheck,
  ShieldCheck, Sparkles, UserPlus
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { HealthGuardBrand } from "../components/HealthGuardBrand";

type Mode = "login" | "register" | "forgot" | "reset" | "verify";

const passwordChecks = [
  ["12+", "12 characters", (value: string) => value.length >= 12],
  ["A–Z", "uppercase", (value: string) => /[A-Z]/.test(value)],
  ["a–z", "lowercase", (value: string) => /[a-z]/.test(value)],
  ["123", "number", (value: string) => /\d/.test(value)],
  ["@#$", "symbol", (value: string) => /[^A-Za-z0-9]/.test(value)]
] as const;

function PasswordStrength({ password }: { password: string }) {
  const passed = passwordChecks.filter(([, , check]) => check(password)).length;
  const label = passed <= 1 ? "Weak" : passed <= 3 ? "Developing" : passed === 4 ? "Strong" : "Excellent";
  return (
    <div className={`password-strength strength-${passed}`} aria-live="polite">
      <div><span>Password strength</span><strong>{password ? label : "Not entered"}</strong></div>
      <div className="strength-track" aria-hidden="true"><span style={{ width: `${passed * 20}%` }} /></div>
      <ul>{passwordChecks.map(([short, text, check]) => <li className={check(password) ? "passed" : ""} key={text}><i>{check(password) ? <Check /> : null}</i><span aria-hidden="true">{short}</span><span className="sr-only">{text}</span></li>)}</ul>
    </div>
  );
}

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, booting, login, register, verifyEmail } = useAuth();
  const mode = useMemo<Mode>(() => location.pathname.includes("register") ? "register" : location.pathname.includes("forgot") ? "forgot" : location.pathname.includes("reset") ? "reset" : location.pathname.includes("verify") ? "verify" : "login", [location.pathname]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(() => params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [seconds, setSeconds] = useState(59);
  const [previewCode, setPreviewCode] = useState(() => (location.state as { previewCode?: string } | null)?.previewCode ?? "");
  const emailRef = useRef<HTMLInputElement>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const from = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    const titles: Record<Mode, string> = { login: "Sign in", register: "Create account", forgot: "Reset password", reset: "Choose password", verify: "Verify email" };
    document.title = `${titles[mode]} — HealthGuard`;
    setError("");
    setMessage("");
  }, [mode]);

  useEffect(() => {
    if (mode !== "verify" || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [mode, seconds]);

  if (!booting && user && ["login", "register"].includes(mode)) return <Navigate to={from && from.startsWith("/") ? from : "/dashboard"} replace />;

  const validPassword = passwordChecks.every(([, , check]) => check(password));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (["login", "register", "forgot"].includes(mode) && !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      emailRef.current?.focus();
      return;
    }
    if (["login", "register", "reset"].includes(mode) && password.length < 12) return setError("Password must be at least 12 characters.");
    if (["register", "reset"].includes(mode) && !validPassword) return setError("Complete all password-strength requirements.");
    if (["register", "reset"].includes(mode) && password !== confirmPassword) return setError("Passwords do not match.");
    setBusy(true);
    try {
      if (mode === "login") {
        const next = await login(email, password);
        if (!next.emailVerified) navigate(`/verify-email?email=${encodeURIComponent(email)}`, { replace: true });
        else navigate(from && from.startsWith("/") ? from : "/dashboard", { replace: true });
      } else if (mode === "register") {
        if (!name.trim()) throw new Error("Enter your full name.");
        const result = await register({ name: name.trim(), email, password, invitationToken: params.get("invitation") ?? undefined });
        setPreviewCode(result.verificationPreviewCode ?? "");
        setSeconds(59);
        navigate(`/verify-email?email=${encodeURIComponent(email)}`, { replace: true, state: { previewCode: result.verificationPreviewCode } });
      } else if (mode === "forgot") {
        await api.post("/auth/forgot-password", { email });
        setMessage("If an account exists, secure reset instructions have been prepared by the configured email provider.");
      } else if (mode === "reset") {
        await api.post("/auth/reset-password", { token: params.get("token"), password });
        setMessage("Password reset. You can now sign in with the new password.");
      } else {
        const code = otp.join("");
        if (code.length !== 6 || !/^\d{6}$/.test(code)) throw new Error("Enter the complete 6-digit verification code.");
        await verifyEmail(email || user?.email || "", code);
        setMessage("Email verified. Let’s complete your health profile.");
        window.setTimeout(() => navigate("/profile/new", { replace: true }), 650);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "HealthGuard could not complete this request.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (seconds > 0 || !email) return;
    setBusy(true); setError("");
    try {
      const result = await api.post<{ verificationPreviewCode?: string }>("/auth/resend-verification", { email });
      setPreviewCode(result.verificationPreviewCode ?? "");
      setSeconds(59); setOtp(["", "", "", "", "", ""]); otpRefs.current[0]?.focus();
      setMessage("A new code has been prepared by the configured email provider.");
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "A new code could not be requested."); }
    finally { setBusy(false); }
  };

  const updateOtp = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setOtp((current) => current.map((value, position) => position === index ? digit : value));
    setError("");
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };
  const pasteOtp = (event: React.ClipboardEvent) => {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (!digits.length) return;
    event.preventDefault();
    setOtp(Array.from({ length: 6 }, (_, index) => digits[index] ?? ""));
    otpRefs.current[Math.min(5, digits.length)]?.focus();
  };

  const content = {
    login: { icon: ShieldCheck, kicker: "SECURE ACCESS", title: "Welcome back to HealthGuard", copy: "Sign in to continue to your protected workspace.", action: "Log in" },
    register: { icon: UserPlus, kicker: "NEW HEALTH NODE", title: "Create your account", copy: "Start a patient-owned HealthGuard workspace.", action: "Create secure account" },
    forgot: { icon: KeyRound, kicker: "ACCOUNT RECOVERY", title: "Reset your password", copy: "Request a time-limited recovery link.", action: "Send reset instructions" },
    reset: { icon: LockKeyhole, kicker: "NEW CREDENTIAL", title: "Choose a new password", copy: "Build a strong credential before continuing.", action: "Reset password" },
    verify: { icon: MailCheck, kicker: "IDENTITY CHECK", title: "OTP verification", copy: `Enter the 6-digit code prepared for ${email || user?.email || "your email"}.`, action: "Verify code" }
  }[mode];
  const Icon = content.icon;

  return (
    <main className="auth-v3-page">
      <header className="public-header auth-v3-header"><HealthGuardBrand /><Link to="/"><ArrowLeft />Back to home</Link></header>
      <section className="auth-v3-stage">
        <form className={`auth-v3-card auth-mode-${mode}`} onSubmit={submit} noValidate>
          <div className="auth-v3-icon" aria-hidden="true"><Icon /></div>
          <div className="auth-v3-heading"><small>{content.kicker}</small><h1>{content.title}</h1><p>{content.copy}</p></div>
          {import.meta.env.DEV && mode === "login" ? <button className="demo-credential" type="button" onClick={() => { setEmail("demo@healthguard.local"); setPassword("HealthGuard!2026"); }}><Sparkles /><span><strong>Use local demo account</strong><small>Available in development mode</small></span></button> : null}
          {error ? <div className="form-error-summary" role="alert">{error}</div> : null}
          {message ? <div className="form-success-summary" role="status">{message}</div> : null}

          {mode === "verify" ? <div className="otp-module"><div className="otp-grid" onPaste={pasteOtp}>{otp.map((digit, index) => <input key={index} ref={(node) => { otpRefs.current[index] = node; }} aria-label={`Verification digit ${index + 1}`} inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={1} value={digit} onChange={(event) => updateOtp(index, event.target.value)} onKeyDown={(event) => { if (event.key === "Backspace" && !digit && index > 0) otpRefs.current[index - 1]?.focus(); if (event.key === "ArrowLeft" && index > 0) otpRefs.current[index - 1]?.focus(); if (event.key === "ArrowRight" && index < 5) otpRefs.current[index + 1]?.focus(); }} />)}</div>{previewCode ? <button className="otp-preview" type="button" onClick={() => { setOtp(previewCode.split("")); otpRefs.current[5]?.focus(); }}><Sparkles />Use local preview code <strong>{previewCode}</strong></button> : null}</div> : null}

          {mode === "register" ? <label htmlFor="auth-name">Full name<div className="auth-input"><UserPlus /><input id="auth-name" type="text" autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); setError(""); }} aria-invalid={Boolean(error && !name.trim())} /></div></label> : null}
          {["login", "register", "forgot"].includes(mode) ? <label htmlFor="auth-email">Email address<div className="auth-input"><Mail /><input ref={emailRef} id="auth-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} aria-invalid={Boolean(error && !/^\S+@\S+\.\S+$/.test(email))} /></div></label> : null}
          {["login", "register", "reset"].includes(mode) ? <label htmlFor="auth-password">{mode === "reset" ? "New password" : "Password"}<div className="password-field auth-input"><LockKeyhole /><input id="auth-password" type={show ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} aria-invalid={Boolean(error && password.length < 12)} /><button type="button" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow((value) => !value)}>{show ? <EyeOff /> : <Eye />}</button></div>{mode === "login" ? <Link className="forgot-inline" to="/forgot-password">Forgot password?</Link> : null}</label> : null}
          {["register", "reset"].includes(mode) ? <><PasswordStrength password={password} /><label htmlFor="auth-confirm">Confirm password<div className="auth-input"><LockKeyhole /><input id="auth-confirm" type={show ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setError(""); }} /></div></label></> : null}

          <button className="button button-primary button-wide auth-submit" type="submit" disabled={busy || (mode === "verify" && otp.join("").length !== 6)}>{busy ? "Working…" : content.action}<ArrowRight /></button>
          {mode === "verify" ? <div className="otp-meta"><span><i />Code expires in {seconds > 0 ? `00:${String(seconds).padStart(2, "0")}` : "expired"}</span><button type="button" disabled={seconds > 0 || busy} onClick={resend}>Resend OTP</button></div> : null}
          <div className="auth-v3-links">{mode !== "login" ? <Link to="/login">Back to sign in</Link> : <p>Don’t have an account? <Link to="/register">Sign up</Link></p>}</div>
          {mode === "login" ? <div className="auth-provider-status"><span>Provider sign-in</span><div><button type="button" disabled>Google</button><button type="button" disabled>Apple</button></div><small></small></div> : null}
          <p className="auth-footnote"></p>
        </form>
      </section>
    </main>
  );
}
