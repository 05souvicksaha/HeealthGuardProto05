import {
  Activity, CloudUpload, Download, FileImage, FileText, FolderUp, HeartPulse, LoaderCircle, Pencil, Pill, Plus, ShieldCheck,
  Trash2, Upload, UserRound, UsersRound
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Dialog } from "../components/Dialog";
import { EmptyState, LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";

const tabs = [
  ["overview", "Overview"], ["patients", "Patient profiles"], ["family", "Family"], ["history", "Medical history"],
  ["reports", "Reports"], ["medications", "Medications"], ["prescriptions", "Prescriptions"], ["timeline", "Timeline"], ["emergency", "Emergency card"]
] as const;
type TabKey = (typeof tabs)[number][0];

interface Item {
  id: string;
  name?: string;
  title?: string;
  relationship?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  allergies?: string[];
  description?: string;
  patientId?: string;
  kind?: string;
  notes?: string;
  occurredOn?: string;
  occurredAt?: string;
  dose?: string;
  schedule?: string;
  startDate?: string;
  endDate?: string;
  clinicianName?: string;
  issuedOn?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  status?: string;
  ocrStatus?: string;
  analysisStatus?: string;
  conditions?: string[];
  medications?: string[];
  contacts?: Array<{ name: string; phone: string; relationship: string }>;
  publishedAt?: string;
  updatedAt?: string;
  emergencyNotes?: string;
}
type Collection = { items: Item[]; total: number };
type HealthRecords = Record<Exclude<TabKey, "overview">, Collection>;

const endpoint: Record<Exclude<TabKey, "overview">, string> = {
  patients: "/patients", family: "/families", history: "/history", reports: "/reports",
  medications: "/medications", prescriptions: "/prescriptions", timeline: "/timeline", emergency: "/emergency-cards"
};
const emptyRecords: HealthRecords = {
  patients: { items: [], total: 0 }, family: { items: [], total: 0 }, history: { items: [], total: 0 },
  reports: { items: [], total: 0 }, medications: { items: [], total: 0 }, prescriptions: { items: [], total: 0 },
  timeline: { items: [], total: 0 }, emergency: { items: [], total: 0 }
};

function humanBytes(value = 0) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function MyHealthPage() {
  const [params, setParams] = useSearchParams();
  const requestedTab = params.get("tab") as TabKey | null;
  const activeTab = tabs.some(([key]) => key === requestedTab) ? requestedTab! : "overview";
  const { notify, playFeedback } = useApp();
  const [records, setRecords] = useState<HealthRecords>(emptyRecords);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState<{ tab: Exclude<TabKey, "overview">; item: Item } | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedPatient, setSelectedPatient] = useState("");
  const [familyTarget, setFamilyTarget] = useState<Item | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const controller = new AbortController();
    try {
      const entries = await Promise.all(Object.entries(endpoint).map(async ([key, path]) => [key, await api.get<Collection>(path, controller.signal)] as const));
      const next = Object.fromEntries(entries) as HealthRecords;
      setRecords(next);
      setSelectedPatient((current) => current || next.patients.items[0]?.id || "");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLoadError(error instanceof Error ? error.message : "Health records could not be loaded.");
    } finally {
      setLoading(false);
    }
    return () => controller.abort();
  }, []);
  useEffect(() => { void load(); }, [load]);

  const patient = records.patients.items.find((item) => item.id === selectedPatient) ?? records.patients.items[0];
  const patientScoped = useMemo(() => ({
    history: records.history.items.filter((item) => !patient || item.patientId === patient.id),
    reports: records.reports.items.filter((item) => !patient || item.patientId === patient.id),
    medications: records.medications.items.filter((item) => !patient || item.patientId === patient.id),
    prescriptions: records.prescriptions.items.filter((item) => !patient || item.patientId === patient.id),
    timeline: records.timeline.items.filter((item) => !patient || item.patientId === patient.id),
    emergency: records.emergency.items.filter((item) => !patient || item.patientId === patient.id)
  }), [patient, records]);

  const openCreate = () => {
    setEditing(null); setFamilyTarget(null); setFormError(""); setFormOpen(true);
  };
  const changeTab = (tab: TabKey) => setParams(tab === "overview" ? {} : { tab });

  const createOrUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const values: Record<string, unknown> = Object.fromEntries(new FormData(event.currentTarget).entries());
    const targetTab = (event.currentTarget.dataset.tab ?? activeTab) as Exclude<TabKey, "overview">;
    if (["history", "medications", "prescriptions", "timeline", "emergency"].includes(targetTab)) values.patientId = patient?.id ?? "";
    if (targetTab === "patients" && !String(values.name ?? "").trim()) return setFormError("Patient name is required.");
    if (targetTab === "patients") values.allergies = String(values.allergies ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    if (targetTab === "family" && !String(values.name ?? "").trim()) return setFormError("Family name is required.");
    if (targetTab === "emergency") {
      values.allergies = String(values.allergies ?? "").split(",").map((value) => value.trim()).filter(Boolean);
      values.conditions = String(values.conditions ?? "").split(",").map((value) => value.trim()).filter(Boolean);
      values.medications = String(values.medications ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    }
    if (!patient && ["history", "medications", "prescriptions", "timeline", "emergency"].includes(targetTab)) return setFormError("Create a patient profile first.");
    setBusy(true);
    try {
      if (familyTarget) {
        await api.post(`/families/${familyTarget.id}/members`, values);
        notify("Family member added.", "success");
      } else if (editing) {
        await api.patch(`${endpoint[targetTab]}/${editing.id}`, values);
        notify("Changes saved.", "success");
      } else {
        await api.post(endpoint[targetTab], values);
        notify(`${tabs.find(([key]) => key === targetTab)?.[1] ?? "Record"} created.`, "success");
      }
      setFormOpen(false); setEditing(null); setFamilyTarget(null); playFeedback(620); await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Record could not be saved.");
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`${endpoint[deleting.tab]}/${deleting.item.id}`);
      notify("Record deleted.", "success");
      setDeleting(null);
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Record could not be deleted.");
    } finally { setBusy(false); }
  };

  const selectFile = (file?: File) => {
    setFormError("");
    if (!file) return setUploadFile(null);
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) return setFormError("Choose a PDF, JPG, JPEG, or PNG file.");
    if (!file.size || file.size > 10 * 1024 * 1024) return setFormError("Choose a non-empty file no larger than 10 MB.");
    setUploadFile(file);
  };
  const upload = async () => {
    if (!patient) return setFormError("Create a patient profile first.");
    if (!uploadFile) return setFormError("Choose one report before uploading.");
    const data = new FormData();
    data.append("file", uploadFile);
    data.append("patientId", patient.id);
    setBusy(true); setUploadProgress(0); setFormError("");
    try {
      await api.uploadReport(data, setUploadProgress);
      notify("Your medical report is now stored securely.", "success", "Congratulations");
      setUploadOpen(false); setUploadFile(null); setUploadProgress(0); await load();
    } catch (error) { setFormError(error instanceof Error ? error.message : "Upload failed."); }
    finally { setBusy(false); }
  };
  const download = async (item: Item) => {
    try {
      const { blob } = await api.download(`/reports/${item.id}/download`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = item.originalName ?? "medical-report"; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { notify(error instanceof Error ? error.message : "Download failed.", "error"); }
  };
  const analyze = async (item: Item) => {
    try { await api.post(`/reports/${item.id}/analyze`, {}); notify("Report analysis completed.", "success"); await load(); }
    catch (error) { notify(error instanceof Error ? error.message : "Report analysis is unavailable.", "warning"); }
  };

  const card = patientScoped.emergency[0];
  const renderList = (tab: Exclude<TabKey, "overview">, items: Item[]) => {
    if (!items.length) return <EmptyState title={`No ${tabs.find(([key]) => key === tab)?.[1].toLowerCase()} yet`} message="Nothing is invented here. Create a server-owned record when you are ready." action={<button className="button button-primary" type="button" onClick={openCreate}><Plus />Create record</button>} />;
    return <div className="record-list">{items.map((item) => <article className="record-item panel" key={item.id}><span className="record-symbol">{tab === "medications" ? <Pill /> : tab === "family" ? <UsersRound /> : <FileText />}</span><div><small>{item.kind ?? item.relationship ?? item.status ?? tab}</small><h2>{item.name ?? item.title ?? item.clinicianName ?? "Health record"}</h2><p>{item.notes ?? item.description ?? item.schedule ?? item.issuedOn ?? item.occurredOn ?? (item.updatedAt ? `Updated ${new Date(item.updatedAt).toLocaleString()}` : "No additional details")}</p></div><div className="record-actions">{tab === "patients" ? <button className="icon-button" type="button" aria-label={`Edit ${item.name}`} onClick={() => { setEditing(item); setFormError(""); setFormOpen(true); }}><Pencil /></button> : null}{tab === "family" ? <button className="button button-outline button-small" type="button" onClick={() => { setFamilyTarget(item); setFormError(""); setFormOpen(true); }}><UserRound />Add member</button> : null}<button className="icon-button danger-ghost" type="button" aria-label={`Delete ${item.name ?? item.title ?? "record"}`} onClick={() => setDeleting({ tab, item })}><Trash2 /></button></div></article>)}</div>;
  };

  return (
    <div className="page health-vault-page">
      <PageHeader title="My Health" description="Patient-owned records protected by backend authentication and ownership checks." actions={<div className="health-page-actions"><button className="button button-outline" type="button" disabled={!patient} onClick={() => { setFormError(""); setUploadOpen(true); }}><Upload />Upload report</button>{activeTab !== "overview" && activeTab !== "reports" ? <button className="button button-primary" type="button" onClick={openCreate}><Plus />Add record</button> : null}</div>} />
      {loadError ? <div className="connectivity-banner" role="alert"><span>{loadError}</span><button type="button" onClick={load}>Retry</button></div> : null}
      <div className="patient-switcher panel"><div><span className="patient-switcher-icon"><UserRound /></span><span><small>ACTIVE PATIENT</small><strong>{patient?.name ?? "No patient profile"}</strong></span></div><label><span className="sr-only">Select active patient</span><select value={patient?.id ?? ""} onChange={(event) => setSelectedPatient(event.target.value)} disabled={!records.patients.total}><option value="">No patient profile</option>{records.patients.items.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div>
      <div className="tab-strip" role="tablist" aria-label="My Health sections">{tabs.map(([key, label]) => <button type="button" role="tab" aria-selected={activeTab === key} className={activeTab === key ? "active" : ""} onClick={() => changeTab(key)} key={key}>{label}</button>)}</div>
      {loading ? <LoadingState label="Loading protected health records…" /> : null}

      {!loading && activeTab === "overview" ? <div className="health-vault-overview">
        <section className="identity-card panel"><span className="large-avatar">{patient?.name?.charAt(0).toUpperCase() ?? "?"}</span><div><small>{patient ? "Primary patient context" : "SETUP REQUIRED"}</small><h2>{patient?.name ?? "Create a patient profile"}</h2><p>{patient ? "All records below are scoped to your authenticated account." : "HealthGuard will not fabricate personal medical information."}</p></div><button className="button button-outline" type="button" onClick={() => changeTab("patients")}>{patient ? "Manage profiles" : "Create profile"}</button></section>
        <section className="health-record-band">
          <div><span className="summary-icon mint"><HeartPulse /></span><small>Blood group</small><strong>{patient?.bloodGroup || "Not added"}</strong></div>
          <div><span className="summary-icon coral"><Activity /></span><small>Allergies</small><strong>{patient?.allergies?.length ? patient.allergies.join(", ") : "None recorded"}</strong></div>
          <div><span className="summary-icon blue"><FileText /></span><small>Reports</small><strong>{patientScoped.reports.length}</strong></div>
          <div><span className="summary-icon mint"><ShieldCheck /></span><small>Emergency card</small><strong>{card?.publishedAt ? "Published" : card ? "Draft" : "Not created"}</strong></div>
        </section>
        <section className="health-node-summary panel"><div><span>CARE RECORD</span><h2>Patient-owned health node</h2><p>Create records only for people whose health information you are authorized to manage.</p></div><div className="mini-node-map"><span><UserRound /><b>{records.patients.total}</b><small>Patients</small></span><span><UsersRound /><b>{records.family.total}</b><small>Families</small></span><span><FileText /><b>{patientScoped.reports.length}</b><small>Reports</small></span><span><Pill /><b>{patientScoped.medications.length}</b><small>Medications</small></span></div></section>
      </div> : null}
      {!loading && activeTab === "patients" ? renderList("patients", records.patients.items) : null}
      {!loading && activeTab === "family" ? renderList("family", records.family.items) : null}
      {!loading && activeTab === "history" ? renderList("history", patientScoped.history) : null}
      {!loading && activeTab === "medications" ? renderList("medications", patientScoped.medications) : null}
      {!loading && activeTab === "prescriptions" ? renderList("prescriptions", patientScoped.prescriptions) : null}
      {!loading && activeTab === "timeline" ? renderList("timeline", patientScoped.timeline) : null}
      {!loading && activeTab === "reports" ? (patientScoped.reports.length ? <div className="record-list">{patientScoped.reports.map((item) => <article className="record-item report-item panel" key={item.id}><span className="record-symbol"><FileText /></span><div><small>{item.mimeType} · {humanBytes(item.size)}</small><h2>{item.title ?? item.originalName}</h2><p>{item.status} · OCR {item.ocrStatus} · AI {item.analysisStatus}</p></div><div className="record-actions"><button className="button button-outline button-small" type="button" onClick={() => analyze(item)}>Analyze</button><button className="icon-button" type="button" aria-label={`Download ${item.originalName}`} onClick={() => download(item)}><Download /></button><button className="icon-button danger-ghost" type="button" aria-label={`Delete ${item.originalName}`} onClick={() => setDeleting({ tab: "reports", item })}><Trash2 /></button></div></article>)}</div> : <EmptyState title="No reports uploaded" message="Upload PDF, JPG, JPEG, or PNG reports up to 10 MB. OCR and AI depend on configured providers." action={<button className="button button-primary" type="button" disabled={!patient} onClick={() => setUploadOpen(true)}><Upload />Upload report</button>} />) : null}
      {!loading && activeTab === "emergency" ? (card ? <section className="emergency-card-builder panel"><div className="emergency-card-preview"><span>HEALTHGUARD / EMERGENCY</span><h2>{patient?.name}</h2><div><small>Blood group</small><strong>{card.bloodGroup || "Not added"}</strong></div><div><small>Allergies</small><strong>{card.allergies?.join(", ") || "None recorded"}</strong></div><p>{card.publishedAt ? `Published ${new Date(card.publishedAt).toLocaleString()}` : "Draft · review before sharing"}</p></div><div><h2>Emergency health card</h2><p>This card only shows data you stored. It does not infer conditions or medications.</p><button className="button button-primary" type="button" onClick={() => { setEditing(card); setFormOpen(true); }}><Pencil />Edit card</button></div></section> : <EmptyState title="Emergency card not created" message="Create a concise card from verified personal information. Missing values remain visibly missing." action={<button className="button button-primary" type="button" disabled={!patient} onClick={openCreate}><ShieldCheck />Create emergency card</button>} />) : null}

      <Dialog open={formOpen} title={familyTarget ? `Add member to ${familyTarget.name}` : editing ? "Edit health record" : `Create ${tabs.find(([key]) => key === activeTab)?.[1] ?? "record"}`} description="Changes are saved to the authenticated backend and scoped to your account." onClose={() => { if (!busy) { setFormOpen(false); setEditing(null); setFamilyTarget(null); } }}>
        <RecordForm tab={familyTarget ? "family" : activeTab as Exclude<TabKey, "overview">} item={editing} familyMember={Boolean(familyTarget)} error={formError} busy={busy} onSubmit={createOrUpdate} />
      </Dialog>
      <Dialog open={uploadOpen} title="Upload medical report" description="HealthGuard validates both the selection and the uploaded file content." onClose={() => { if (!busy) setUploadOpen(false); }}>
        <div className={`upload-zone premium-drop-zone${dragActive ? " drag-active" : ""}`} role="button" tabIndex={0} aria-label="Choose or drop one medical report" onClick={() => fileRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") fileRef.current?.click(); }} onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => { event.preventDefault(); setDragActive(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragActive(false); }} onDrop={(event) => { event.preventDefault(); setDragActive(false); selectFile(event.dataTransfer.files[0]); }}>
          <input ref={fileRef} className="sr-only" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => selectFile(event.target.files?.[0])} />
          <span className="upload-constellation" aria-hidden="true"><span><FileText /></span><strong><FolderUp /></strong><span><FileImage /></span></span>
          <CloudUpload className="drop-cloud" /><strong>Drop your medical report here</strong><span>or <u>browse files</u> from this device</span>
          <div className="upload-limits"><span>PDF, JPG, JPEG, PNG</span><span>Maximum 10 MB</span></div>
        </div>
        {uploadFile ? <div className="selected-file"><FileText /><span><strong>{uploadFile.name}</strong><small>{humanBytes(uploadFile.size)}</small></span><button type="button" className="button button-ghost button-small" onClick={() => setUploadFile(null)}>Remove</button></div> : null}
        {busy ? <div className="upload-progress" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${uploadProgress}%` }} /><strong>{uploadProgress}% uploaded</strong></div> : null}
        {formError ? <p className="field-error" role="alert">{formError}</p> : null}
        <div className="dialog-actions"><button className="button button-outline" type="button" disabled={busy} onClick={() => setUploadOpen(false)}>Cancel</button><button className="button button-primary" type="button" disabled={busy || !uploadFile} onClick={upload}>{busy ? <LoaderCircle className="spin" /> : <Upload />}{busy ? "Uploading…" : "Upload report"}</button></div>
      </Dialog>
      <Dialog open={Boolean(deleting)} title="Delete health record?" description="This permanently deletes the selected server record and cannot be undone." onClose={() => { if (!busy) setDeleting(null); }}>
        <p className="confirm-copy">Delete <strong>{deleting?.item.name ?? deleting?.item.title ?? deleting?.item.originalName ?? "this record"}</strong>? Other records are not affected.</p>
        {formError ? <p className="field-error" role="alert">{formError}</p> : null}
        <div className="dialog-actions"><button className="button button-outline" type="button" autoFocus disabled={busy} onClick={() => setDeleting(null)}>Cancel</button><button className="button button-danger" type="button" disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Delete permanently"}</button></div>
      </Dialog>
    </div>
  );
}

function RecordForm({ tab, item, familyMember, error, busy, onSubmit }: { tab: Exclude<TabKey, "overview">; item: Item | null; familyMember: boolean; error: string; busy: boolean; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const fields: Partial<Record<Exclude<TabKey, "overview">, Array<[string, string, string]>>> = {
    patients: [["name", "Full name", "text"], ["relationship", "Relationship", "text"], ["dateOfBirth", "Date of birth", "date"], ["bloodGroup", "Blood group", "text"], ["allergies", "Allergies (comma separated)", "text"], ["emergencyNotes", "Emergency notes", "textarea"]],
    family: familyMember ? [["name", "Member name", "text"], ["relationship", "Relationship", "text"]] : [["name", "Family name", "text"], ["description", "Description", "textarea"]],
    history: [["kind", "Event type", "text"], ["title", "Title", "text"], ["occurredOn", "Date", "date"], ["notes", "Notes", "textarea"]],
    medications: [["name", "Medication", "text"], ["dose", "Dose", "text"], ["schedule", "Schedule", "text"], ["startDate", "Start date", "date"], ["endDate", "End date", "date"], ["notes", "Notes", "textarea"]],
    prescriptions: [["clinicianName", "Clinician name (as written)", "text"], ["issuedOn", "Issued on", "date"], ["notes", "Prescription notes", "textarea"]],
    timeline: [["type", "Event type", "text"], ["title", "Title", "text"], ["occurredAt", "Date and time", "datetime-local"], ["notes", "Notes", "textarea"]],
    emergency: [["bloodGroup", "Blood group", "text"], ["allergies", "Allergies (comma separated)", "text"], ["conditions", "Conditions (comma separated)", "text"], ["medications", "Medications (comma separated)", "text"]]
  };
  return <form className="record-form" data-tab={tab} onSubmit={onSubmit} noValidate>{error ? <div className="form-error-summary" role="alert">{error}</div> : null}<div className="field-grid">{(fields[tab] ?? []).map(([name, label, type]) => <label htmlFor={`record-${name}`} key={name}>{label}{type === "textarea" ? <textarea className="resize-none" id={`record-${name}`} name={name} rows={4} defaultValue={String(item?.[name as keyof Item] ?? "")} /> : <input id={`record-${name}`} name={name} type={type} defaultValue={Array.isArray(item?.[name as keyof Item]) ? (item?.[name as keyof Item] as string[]).join(", ") : String(item?.[name as keyof Item] ?? "")} />}</label>)}</div><div className="dialog-actions"><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Saving…" : item ? "Save changes" : familyMember ? "Add family member" : "Create record"}</button></div></form>;
}
