import { Activity, Building2, CheckCircle2, Database, FileClock, HeartPulse, Pencil, Plus, Power, RefreshCcw, Send, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog } from "../components/Dialog";
import { EmptyState, LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useHealthData } from "../context/DataContext";
import { api, type AuthUser } from "../services/api";

interface Stats { databaseMode: string; counts: Record<string, number>; providers: Record<string, { provider: string; configured: boolean; durable?: boolean }> }
interface AuditEvent { id: string; actorId: string; action: string; resource: string; resourceId?: string; outcome: string; requestId: string; occurredAt: string }
interface AdminContentItem { id: string; name?: string; title?: string; question?: string; code?: string; specialty?: string; category?: string; status?: string; verifiedAt?: string; [key: string]: unknown }

const contentCollections = ["hospitals", "doctors", "diseases", "medicalProtocols", "ambulances", "drivers", "flashcards", "quizzes"] as const;
const contentTemplates: Record<(typeof contentCollections)[number], Record<string, unknown>> = {
  hospitals: { name: "", type: "", address: "", emergency: false, specialties: [] },
  doctors: { name: "", specialty: "", qualifications: [], availability: [] },
  diseases: { name: "", aliases: [], symptoms: [], redFlags: [], specialty: "" },
  medicalProtocols: { title: "", category: "", severity: "moderate", tags: [], steps: [], doNot: [] },
  ambulances: { code: "", status: "AVAILABLE", simulation: false, available: true },
  drivers: { userId: "", licenseNumber: "", status: "AVAILABLE" },
  flashcards: { question: "", answer: "", category: "" },
  quizzes: { title: "", category: "", questions: [] }
};

export function AdminPage() {
  const { data } = useHealthData();
  const { user } = useAuth();
  const { notify } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [audits, setAudits] = useState<AuditEvent[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [contentCollection, setContentCollection] = useState<(typeof contentCollections)[number]>("hospitals");
  const [contentItems, setContentItems] = useState<AdminContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);
  const [contentEditing, setContentEditing] = useState<AdminContentItem | null>(null);
  const [contentDraft, setContentDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [statsResult, auditResult] = await Promise.all([api.get<Stats>("/admin/stats"), api.get<{ items: AuditEvent[] }>("/admin/audit")]);
      setStats(statsResult); setAudits(auditResult.items);
      if (user?.role === "ADMIN") setUsers((await api.get<{ items: AuthUser[] }>("/admin/users")).items);
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Developer console could not load."); }
    finally { setLoading(false); }
  }, [user?.role]);
  useEffect(() => { void load(); }, [load]);
  const loadContent = useCallback(async () => {
    if (user?.role !== "ADMIN") return;
    setContentLoading(true);
    try { setContentItems((await api.get<{ items: AdminContentItem[] }>(`/admin/content/${contentCollection}?limit=50`)).items); }
    catch (nextError) { notify(nextError instanceof Error ? nextError.message : "Admin content could not be loaded.", "error"); }
    finally { setContentLoading(false); }
  }, [contentCollection, notify, user?.role]);
  useEffect(() => { void loadContent(); }, [loadContent]);

  const metrics = useMemo(() => [
    { label: "Users", value: stats?.counts.users ?? 0, icon: UsersRound },
    { label: "Patient profiles", value: stats?.counts.patients ?? 0, icon: HeartPulse },
    { label: "Hospitals", value: stats?.counts.hospitals ?? data?.hospitals.length ?? 0, icon: Building2 },
    { label: "Audit events", value: audits.length, icon: FileClock }
  ], [audits.length, data?.hospitals.length, stats]);
  const importData = async () => {
    setBusy(true);
    try { const result = await api.post<{ insertedOrUpdated: Record<string, number> }>("/import/supplied", {}); notify(`Import complete: ${Object.values(result.insertedOrUpdated).reduce((sum, value) => sum + value, 0)} records upserted.`, "success"); await load(); }
    catch (nextError) { notify(nextError instanceof Error ? nextError.message : "Import failed.", "error"); }
    finally { setBusy(false); }
  };
  const invite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const result = await api.post<{ previewToken?: string }>("/developer/invitations", values);
      notify(result.previewToken ? "Invitation created. Development preview token returned by the console email provider." : "Invitation created.", "success");
      setInviteOpen(false);
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Invitation could not be created."); }
    finally { setBusy(false); }
  };
  const updateUser = async (target: AuthUser, patch: Partial<AuthUser>) => {
    try { const updated = await api.patch<AuthUser>(`/admin/users/${target.id}`, patch); setUsers((current) => current.map((item) => item.id === updated.id ? updated : item)); notify("User access updated.", "success"); }
    catch (nextError) { notify(nextError instanceof Error ? nextError.message : "User access could not be updated.", "error"); }
  };
  const editContent = (item?: AdminContentItem) => {
    const editable = item ? Object.fromEntries(Object.entries(item).filter(([key]) => !["id", "createdAt", "updatedAt", "sourceKey", "verifiedAt"].includes(key))) : contentTemplates[contentCollection];
    setContentEditing(item ?? null); setContentDraft(JSON.stringify(editable, null, 2)); setError(""); setContentOpen(true);
  };
  const saveContent = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const payload = JSON.parse(contentDraft) as Record<string, unknown>;
      if (contentEditing) await api.patch(`/admin/content/${contentCollection}/${contentEditing.id}`, payload);
      else await api.post(`/admin/content/${contentCollection}`, payload);
      notify(contentEditing ? "Admin content updated." : "Admin content created.", "success");
      setContentOpen(false); await loadContent(); await load();
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Admin content could not be saved."); }
    finally { setBusy(false); }
  };
  const contentAction = async (item: AdminContentItem, action: "deactivate" | "verify") => {
    try { await api.post(`/admin/content/${contentCollection}/${item.id}/${action}`, {}); notify(action === "verify" ? "Content verification recorded." : "Content deactivated.", "success"); await loadContent(); }
    catch (nextError) { notify(nextError instanceof Error ? nextError.message : "Admin action failed.", "error"); }
  };
  const contentName = (item: AdminContentItem) => String(item.name ?? item.title ?? item.question ?? item.code ?? item.id);

  return (
    <div className="page admin-page developer-console-page">
      <PageHeader title="Developer Console" description="Database state, provider readiness, users, imports, and privacy-safe audit events." actions={<div className="console-actions">{user?.role === "ADMIN" ? <button className="button button-primary" type="button" onClick={() => { setError(""); setInviteOpen(true); }}><Send />Invite operator</button> : null}<button className="button button-outline" type="button" onClick={load}><RefreshCcw />Refresh</button></div>} />
      {error && !inviteOpen ? <div className="connectivity-banner" role="alert"><span>{error}</span><button type="button" onClick={load}>Retry</button></div> : null}
      {loading ? <LoadingState label="Reading operational state…" /> : <>
        <section className="admin-metrics">{metrics.map(({ label, value, icon: Icon }) => <div className="admin-metric" key={label}><span><Icon /></span><div><strong>{value}</strong><small>{label}</small></div></div>)}</section>
        <div className="admin-layout">
          <section className="panel admin-data-panel">
            <div className="panel-heading"><div><h2>Data pipeline</h2><p>Idempotent upserts preserve traceable supplied values.</p></div><button className="button button-outline button-small" type="button" disabled={busy} onClick={importData}><Database />{busy ? "Importing…" : "Run import"}</button></div>
            <div className="data-source-table" role="table" aria-label="Healthcare data imports">
              <div role="row" className="data-source-head"><span role="columnheader">Collection</span><span role="columnheader">Records</span><span role="columnheader">Status</span></div>
              {[["Hospitals", stats?.counts.hospitals], ["Protocols", stats?.counts.medicalProtocols], ["Flashcards", stats?.counts.flashcards], ["Reports", stats?.counts.medicalReports]].map(([name, count]) => <div role="row" key={String(name)}><span role="cell"><Database />{name}</span><strong role="cell">{count ?? 0}</strong><span role="cell" className="tag tag-success">Stored</span></div>)}
            </div>
          </section>
          <section className="panel provider-panel">
            <div className="panel-heading"><h2>External providers</h2></div>
            {Object.entries(stats?.providers ?? {}).map(([name, provider]) => <div className="provider-row" key={name}><span><Activity /></span><div><strong>{name.toUpperCase()}</strong><small>{provider.provider}</small></div><em className={provider.configured ? "configured" : ""}>{provider.configured ? "Configured" : "Not configured"}</em></div>)}
            <div className="provider-row"><span><Database /></span><div><strong>DATABASE</strong><small>{stats?.databaseMode}</small></div><em className="configured">Connected</em></div>
          </section>
          {user?.role === "ADMIN" ? <section className="panel admin-users">
            <div className="panel-heading"><div><h2>Users & roles</h2><p>Server-side role checks remain authoritative.</p></div></div>
            <div className="user-access-list">{users.map((target) => <div key={target.id}><span className="avatar">{target.name.charAt(0).toUpperCase()}</span><div><strong>{target.name}</strong><small>{target.email}</small></div><label><span className="sr-only">Role for {target.name}</span><select value={target.role} disabled={target.id === user.id} onChange={(event) => updateUser(target, { role: event.target.value as AuthUser["role"] })}><option>USER</option><option>DEVELOPER</option><option>ADMIN</option><option>DRIVER</option></select></label><button className="button button-outline button-small" type="button" disabled={target.id === user.id} onClick={() => updateUser(target, { status: target.status === "ACTIVE" ? "DISABLED" : "ACTIVE" })}>{target.status === "ACTIVE" ? "Disable" : "Activate"}</button></div>)}</div>
          </section> : <EmptyState title="User administration requires Admin" message="Developer accounts can inspect health and imports but cannot change user access." />}
          {user?.role === "ADMIN" ? <section className="panel admin-content-manager">
            <div className="panel-heading"><div><h2>Content administration</h2><p>Create, update, verify, or deactivate allowlisted operational records.</p></div><button className="button button-primary button-small" type="button" onClick={() => editContent()}><Plus />Create</button></div>
            <div className="admin-content-toolbar"><label htmlFor="content-collection">Collection<select id="content-collection" value={contentCollection} onChange={(event) => setContentCollection(event.target.value as (typeof contentCollections)[number])}>{contentCollections.map((name) => <option key={name}>{name}</option>)}</select></label><button className="button button-outline button-small" type="button" onClick={loadContent}><RefreshCcw />Refresh</button></div>
            {contentLoading ? <LoadingState label="Reading admin content…" /> : contentItems.length ? <div className="admin-content-list">{contentItems.slice(0, 12).map((item) => <div key={item.id}><div><strong>{contentName(item)}</strong><small>{String(item.specialty ?? item.category ?? item.status ?? "Active")}{item.verifiedAt ? " · verified" : ""}</small></div><button type="button" aria-label={`Edit ${contentName(item)}`} onClick={() => editContent(item)}><Pencil /></button><button type="button" aria-label={`Verify ${contentName(item)}`} onClick={() => contentAction(item, "verify")}><CheckCircle2 /></button><button type="button" aria-label={`Deactivate ${contentName(item)}`} onClick={() => contentAction(item, "deactivate")}><Power /></button></div>)}</div> : <EmptyState title="No records in this collection" message="Create a source-labeled record only when you have authoritative data." />}
          </section> : null}
          <section className="panel audit-log">
            <div className="panel-heading"><div><h2>Audit stream</h2><p>Actor, action, resource, outcome, request ID, and timestamp; no patient content.</p></div></div>
            {audits.length ? <ol>{audits.slice(0, 20).map((event) => <li key={event.id}><span className={event.outcome === "SUCCESS" ? "success" : "warning"} /><time>{new Date(event.occurredAt).toLocaleString()}</time><div><strong>{event.action}</strong><small>{event.resource}{event.resourceId ? ` · ${event.resourceId}` : ""}</small></div><code>{event.requestId}</code></li>)}</ol> : <div className="quiet-empty"><span className="summary-icon blue"><FileClock /></span><div><strong>No audit events</strong><p>Sensitive server actions will appear here after they occur.</p></div></div>}
          </section>
        </div>
      </>}
      <Dialog open={inviteOpen} title="Invite an operator" description="The token is random, expiring, single-use, and bound to the recipient email." onClose={() => { if (!busy) setInviteOpen(false); }}>
        <form className="record-form" onSubmit={invite} noValidate>{error ? <div className="form-error-summary" role="alert">{error}</div> : null}<div className="field-grid"><label htmlFor="invite-email">Email<input id="invite-email" name="email" type="email" autoComplete="email" /></label><label htmlFor="invite-role">Role<select id="invite-role" name="role" defaultValue="DEVELOPER"><option>DEVELOPER</option><option>DRIVER</option><option>ADMIN</option></select></label></div><div className="dialog-actions"><button className="button button-outline" type="button" onClick={() => setInviteOpen(false)}>Cancel</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Creating…" : "Create invitation"}</button></div></form>
      </Dialog>
      <Dialog open={contentOpen} title={contentEditing ? `Edit ${contentCollection}` : `Create ${contentCollection}`} description="Only allowlisted fields are persisted. Keep healthcare content source-grounded and do not invent missing facts." onClose={() => { if (!busy) setContentOpen(false); }}>
        <form className="record-form" onSubmit={saveContent} noValidate>{error ? <div className="form-error-summary" role="alert">{error}</div> : null}<label htmlFor="admin-content-json">Record JSON<textarea id="admin-content-json" className="admin-json-editor resize-none" rows={16} value={contentDraft} onChange={(event) => { setContentDraft(event.target.value); setError(""); }} spellCheck="false" /></label><div className="dialog-actions"><button className="button button-outline" type="button" onClick={() => setContentOpen(false)}>Cancel</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Saving…" : contentEditing ? "Save changes" : "Create record"}</button></div></form>
      </Dialog>
    </div>
  );
}
