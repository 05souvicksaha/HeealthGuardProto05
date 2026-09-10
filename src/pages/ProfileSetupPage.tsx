import { ArrowLeft, Check, ImagePlus, LoaderCircle, ShieldCheck, Upload, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog } from "../components/Dialog";
import { HealthGuardBrand } from "../components/HealthGuardBrand";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

interface PatientRecord { id: string }
interface ContactDraft { name: string; relationship: string; phone: string }

const emptyContact = (): ContactDraft => ({ name: "", relationship: "", phone: "" });
const emailPattern = /^\S+@\S+\.\S+$/;

export function ProfileSetupPage() {
  const { user } = useAuth();
  const { notify } = useApp();
  const navigate = useNavigate();
  const firstErrorRef = useRef<HTMLInputElement>(null);
  const dateOfBirthRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? "");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [contacts, setContacts] = useState<ContactDraft[]>([emptyContact(), emptyContact()]);
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [createdPatientId, setCreatedPatientId] = useState("");

  const previewUrl = useMemo(() => photo ? URL.createObjectURL(photo) : "", [photo]);

  useEffect(() => { document.title = "Create health profile — HealthGuard"; }, []);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || busy) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [busy, dirty]);

  const choosePhoto = (file?: File) => {
    if (!file) return;
    setError("");
    if (!["image/jpeg", "image/png"].includes(file.type)) return setError("Choose a JPG or PNG profile photo.");
    if (!file.size || file.size > 2 * 1024 * 1024) return setError("Profile photos must be non-empty and no larger than 2 MB.");
    setPhoto(file);
    setDirty(true);
  };

  const updateContact = (index: number, field: keyof ContactDraft, value: string) => {
    setContacts((current) => current.map((contact, position) => position === index ? { ...contact, [field]: value } : contact));
    setDirty(true);
    setError("");
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) { setError("Enter the patient’s full name."); firstErrorRef.current?.focus(); return; }
    if (!dateOfBirth) { setError("Choose a date of birth."); dateOfBirthRef.current?.focus(); return; }
    if (!phone.trim()) { setError("Enter a primary phone number."); phoneRef.current?.focus(); return; }
    if (!emailPattern.test(email)) { setError("Enter a valid primary email address."); emailRef.current?.focus(); return; }
    const contactError = contacts.find((contact) => (contact.name || contact.phone || contact.relationship) && (!contact.name || !contact.phone));
    if (contactError) return setError("For each emergency contact, add both a name and phone number.");

    setBusy(true);
    try {
      const allergyList = allergies.split(/[,\n]/).map((value) => value.trim()).filter(Boolean);
      const conditionList = conditions.split(/[,\n]/).map((value) => value.trim()).filter(Boolean);
      const patientInput = { name: name.trim(), relationship: "Self", dateOfBirth, gender, phone: phone.trim(), email: email.trim(), bloodGroup, allergies: allergyList, emergencyNotes: conditionList.join(", ") };
      const patient = createdPatientId
        ? await api.patch<PatientRecord>(`/patients/${createdPatientId}`, patientInput)
        : await api.post<PatientRecord>("/patients", patientInput);
      if (!createdPatientId) setCreatedPatientId(patient.id);

      const validContacts = contacts.filter((contact) => contact.name && contact.phone);
      const additionalWork: Promise<unknown>[] = [api.post("/emergency-cards", { patientId: patient.id, bloodGroup, allergies: allergyList, conditions: conditionList, contacts: validContacts })];
      if (photo) {
        const data = new FormData();
        data.append("file", photo);
        additionalWork.push(api.uploadPatientPhoto(patient.id, data, setPhotoProgress));
      }
      await Promise.all(additionalWork);
      setDirty(false);
      notify("Your patient profile and emergency details are ready.", "success", "Profile created");
      navigate("/dashboard", { replace: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Your profile could not be saved. Review the details and try again.");
    } finally {
      setBusy(false);
    }
  };

  const back = () => dirty ? setLeaveOpen(true) : navigate("/dashboard");

  return (
    <main className="profile-setup-page">
      <header className="public-header profile-setup-header"><HealthGuardBrand /></header>
      <section className="profile-progress" aria-label="Profile setup progress">
        <strong>Step 2: Complete your profile (2 of 3)</strong>
        <ol>{["Account", "Profile", "Emergency"].map((label, index) => <li className={index === 0 ? "complete" : index === 1 ? "current" : ""} key={label}><span>{index === 0 ? <Check /> : null}</span><small>{label}</small></li>)}</ol>
      </section>

      <form className="profile-setup-card" onSubmit={save} noValidate>
        <div className="profile-card-title"><span><UserRound /></span><div><h1>Tell us about yourself</h1><p>Add only information you are authorized to manage. You can edit it later.</p></div></div>
        {error ? <div className="form-error-summary" role="alert">{error}</div> : null}

        <section className="profile-form-section">
          <h2>Personal details</h2>
          <div className="profile-personal-grid">
            <div className="profile-fields">
              <label htmlFor="profile-name">Full name<input ref={firstErrorRef} id="profile-name" value={name} autoComplete="name" onChange={(event) => { setName(event.target.value); setDirty(true); setError(""); }} aria-invalid={Boolean(error && !name.trim())} /></label>
              <div className="profile-field-row">
                <label htmlFor="profile-dob">Date of birth<input ref={dateOfBirthRef} id="profile-dob" type="date" value={dateOfBirth} onChange={(event) => { setDateOfBirth(event.target.value); setDirty(true); setError(""); }} aria-invalid={Boolean(error && !dateOfBirth)} /></label>
                <label htmlFor="profile-gender">Gender<select id="profile-gender" value={gender} onChange={(event) => { setGender(event.target.value); setDirty(true); }}><option value="">Prefer not to say</option><option>Woman</option><option>Man</option><option>Non-binary</option><option>Self-described</option></select></label>
                <label htmlFor="profile-blood">Blood group<select id="profile-blood" value={bloodGroup} onChange={(event) => { setBloodGroup(event.target.value); setDirty(true); }}><option value="">Not added</option>{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((value) => <option key={value}>{value}</option>)}</select></label>
              </div>
            </div>
            <div className="profile-photo-field">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={(event) => choosePhoto(event.target.files?.[0])} className="sr-only" />
              <button type="button" onClick={() => fileRef.current?.click()} aria-label={photo ? "Change profile photo" : "Choose profile photo"}>
                {previewUrl ? <img src={previewUrl} alt="Selected profile preview" /> : <ImagePlus />}
                <span>{photo ? "Change photo" : "Photo upload"}</span>
              </button>
              <small>Optional · JPG or PNG · 2 MB max</small>
              {photo && !busy ? <button className="profile-photo-remove" type="button" onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ""; }}>Remove</button> : null}
              {busy && photo ? <span className="profile-photo-progress"><Upload /> {photoProgress}%</span> : null}
            </div>
          </div>
        </section>

        <section className="profile-form-section">
          <h2>Contact information</h2>
          <div className="profile-field-row two">
            <label htmlFor="profile-phone">Primary phone number<input ref={phoneRef} id="profile-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setDirty(true); setError(""); }} aria-invalid={Boolean(error && !phone.trim())} /></label>
            <label htmlFor="profile-email">Primary email<input ref={emailRef} id="profile-email" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setDirty(true); setError(""); }} aria-invalid={Boolean(error && !emailPattern.test(email))} /></label>
          </div>
        </section>

        <section className="profile-form-section">
          <h2>Emergency contacts <small>Optional</small></h2>
          <div className="emergency-contact-grid">
            {contacts.map((contact, index) => (
              <fieldset key={index}><legend>Contact {index + 1}</legend><label>Name<input value={contact.name} autoComplete="off" onChange={(event) => updateContact(index, "name", event.target.value)} /></label><label>Relationship<select value={contact.relationship} onChange={(event) => updateContact(index, "relationship", event.target.value)}><option value="">Select relationship</option><option>Parent</option><option>Partner</option><option>Sibling</option><option>Friend</option><option>Caregiver</option><option>Other</option></select></label><label>Phone number<input type="tel" value={contact.phone} autoComplete="off" onChange={(event) => updateContact(index, "phone", event.target.value)} /></label></fieldset>
            ))}
          </div>
        </section>

        <section className="profile-form-section">
          <h2>Initial medical context <small>Optional</small></h2>
          <label htmlFor="profile-allergies">Known allergies<textarea className="resize-none" id="profile-allergies" value={allergies} onChange={(event) => { setAllergies(event.target.value); setDirty(true); }} placeholder="One allergy per line, or separate with commas" /></label>
          <label htmlFor="profile-conditions">Key health conditions<textarea className="resize-none" id="profile-conditions" value={conditions} onChange={(event) => { setConditions(event.target.value); setDirty(true); }} placeholder="Add only conditions confirmed for this patient" /></label>
        </section>

        <div className="profile-form-actions"><button className="button button-outline" type="button" disabled={busy} onClick={back}><ArrowLeft />Back</button><button className="button button-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" /> : <ShieldCheck />}{busy ? "Saving profile…" : "Save & continue"}</button></div>
      </form>

      <Dialog open={leaveOpen} title="Discard profile changes?" description="The information entered on this page has not been saved." onClose={() => setLeaveOpen(false)}>
        <div className="dialog-actions"><button className="button button-outline" type="button" onClick={() => setLeaveOpen(false)}>Keep editing</button><button className="button button-danger" type="button" onClick={() => navigate("/dashboard")}>Discard changes</button></div>
      </Dialog>
    </main>
  );
}
