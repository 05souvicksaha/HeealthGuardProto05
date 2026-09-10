import { Ambulance, CheckCircle2, Clock3, LocateFixed, MapPin, Navigation, Phone, Radio, Route } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { PageHeader } from "../components/PageHeader";
import { useApp } from "../context/AppContext";
import { useHealthData } from "../context/DataContext";
import { api, getAccessToken } from "../services/api";

const stages = ["REQUESTED", "ASSIGNED", "EN_ROUTE_PICKUP", "ARRIVED_PICKUP", "EN_ROUTE_HOSPITAL", "COMPLETED"] as const;
const labels: Record<string, string> = {
  REQUESTED: "Request received", ASSIGNED: "Simulation unit assigned", EN_ROUTE_PICKUP: "En route to pickup",
  ARRIVED_PICKUP: "Arrived at pickup", EN_ROUTE_HOSPITAL: "En route to hospital", COMPLETED: "Simulation complete", CANCELLED: "Cancelled"
};
interface Patient { id: string; name: string }
interface RequestState {
  id: string; pickup: string; destinationHospitalId: string; priority: string; status: string; simulation: boolean;
  etaMinutes: number | null; ambulanceId?: string; statusHistory: Array<{ status: string; at: string }>;
}

export function AmbulancePage() {
  const { data } = useHealthData();
  const { notify, playFeedback } = useApp();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [priority, setPriority] = useState("HIGH");
  const [request, setRequest] = useState<RequestState | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [realtime, setRealtime] = useState<"connecting" | "connected" | "offline">("offline");

  useEffect(() => {
    api.get<{ items: Patient[] }>("/patients").then((value) => { setPatients(value.items); setPatientId(value.items[0]?.id ?? ""); }).catch(() => undefined);
    api.get<{ items: RequestState[] }>("/ambulances/requests").then((value) => {
      const active = value.items.find((item) => !["COMPLETED", "CANCELLED"].includes(item.status));
      if (active) setRequest(active);
    }).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!request?.id) return;
    let socket: Socket | null = io({ auth: { token: getAccessToken() }, transports: ["websocket", "polling"] });
    setRealtime("connecting");
    socket.on("connect", () => {
      setRealtime("connected");
      socket?.emit("ambulance:join", request.id, (result: { ok: boolean }) => { if (!result.ok) setRealtime("offline"); });
    });
    socket.on("connect_error", () => setRealtime("offline"));
    socket.on("ambulance:status", (next: RequestState) => { if (next.id === request.id) setRequest(next); });
    return () => { socket?.disconnect(); socket = null; };
  }, [request?.id]);

  const currentStage = useMemo(() => Math.max(0, stages.indexOf(request?.status as (typeof stages)[number])), [request?.status]);
  const emergencyHospitals = data?.hospitals.filter((hospital) => hospital.emergency).slice(0, 30) ?? [];
  const locate = () => {
    if (!navigator.geolocation) return notify("Location is unavailable. Enter a pickup point manually.", "error");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setPickup(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
      setLocating(false); notify("Pickup coordinates added with your permission.", "success");
    }, () => { setLocating(false); notify("Location permission was denied or timed out.", "warning"); }, { timeout: 7000, enableHighAccuracy: false });
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pickup.trim() || !destination) return notify("Add a pickup point and destination before starting the simulation.", "warning");
    setBusy(true);
    try {
      const next = await api.post<RequestState>("/ambulances/requests", { patientId: patientId || undefined, pickup: pickup.trim(), destinationHospitalId: destination, priority, simulation: true });
      setRequest(next); playFeedback(600); notify("Simulation request created. No real vehicle was dispatched.", "info");
    } catch (error) { notify(error instanceof Error ? error.message : "Request could not be created.", "error"); }
    finally { setBusy(false); }
  };
  const advance = async () => {
    if (!request) return;
    setBusy(true);
    try { setRequest(await api.post<RequestState>(`/ambulances/requests/${request.id}/simulate`)); playFeedback(560); }
    catch (error) { notify(error instanceof Error ? error.message : "Simulation could not advance.", "error"); }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    if (!request) return;
    setBusy(true);
    try { setRequest(await api.patch<RequestState>(`/ambulances/requests/${request.id}/cancel`, {})); notify("Simulation cancelled.", "info"); }
    catch (error) { notify(error instanceof Error ? error.message : "Request could not be cancelled.", "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="page ambulance-page ambulance-ops-page">
      <PageHeader title="Ambulance Operations" description="Ambulance tracing at your finger tips" actions={<span className="demo-label">SIMULATION MODE</span>} />
      <div className="ambulance-layout">
        <form className="ambulance-form panel" onSubmit={submit} noValidate>
          <div className="form-module-heading"><span>REQUEST MODULE</span><h2>Start simulation</h2></div>
          <label htmlFor="ambulance-patient">Patient<select id="ambulance-patient" value={patientId} onChange={(event) => setPatientId(event.target.value)}><option value="">No patient attached</option>{patients.map((patient) => <option value={patient.id} key={patient.id}>{patient.name}</option>)}</select></label>
          <label htmlFor="ambulance-pickup">Pickup point<div className="input-with-action"><input id="ambulance-pickup" value={pickup} onChange={(event) => setPickup(event.target.value)} placeholder="Enter address or use your location" /><button type="button" onClick={locate} disabled={locating}><LocateFixed />{locating ? "Locating…" : "Use location"}</button></div></label>
          <label htmlFor="ambulance-destination">Destination<select id="ambulance-destination" value={destination} onChange={(event) => setDestination(event.target.value)}><option value="">Choose an emergency-listed hospital</option>{emergencyHospitals.map((hospital) => <option value={hospital.name} key={hospital.name}>{hospital.name}</option>)}</select></label>
          <fieldset><legend>Emergency priority</legend><div className="priority-options">{["MODERATE", "HIGH", "CRITICAL"].map((item) => <label key={item}><input type="radio" name="priority" value={item} checked={priority === item} onChange={() => setPriority(item)} /><span>{item.toLowerCase()}</span></label>)}</div></fieldset>
          {!request || ["COMPLETED", "CANCELLED"].includes(request.status) ? <button className="button button-danger button-wide" type="submit" disabled={busy}><Ambulance />{busy ? "Creating…" : "Start simulated request"}</button> : <div className="active-request-note"><Radio /><span><strong>Request active</strong><small>{request.id}</small></span></div>}
        </form>

        <section className="tracking-panel panel">
          <div className="tracking-map" aria-label="Abstract simulation route">
            <div className="map-grid" aria-hidden="true" /><span className="map-pickup"><MapPin /></span><span className={`map-ambulance stage-${Math.min(currentStage, 3)}`}><Ambulance /></span><span className="map-destination"><Navigation /></span><div className="route-line" aria-hidden="true" />
            <span className={`realtime-chip ${realtime}`}><i />{request ? `Realtime ${realtime}` : "Realtime waits for a request"}</span>
          </div>
          {request ? <div className="tracking-details">
            <div className="eta-block"><Clock3 /><span><small>ETA (simulation)</small><strong>{request.etaMinutes === null ? "—" : `${request.etaMinutes} min`}</strong></span><em>Simulation</em></div>
            <ol className="stage-list">{stages.map((status, index) => <li className={index <= currentStage && request.status !== "CANCELLED" ? "complete" : ""} key={status}>{index < currentStage ? <CheckCircle2 /> : <span>{index + 1}</span>}<div><strong>{labels[status]}</strong><small>{request.statusHistory.find((entry) => entry.status === status)?.at ? new Date(request.statusHistory.find((entry) => entry.status === status)!.at).toLocaleTimeString() : ""}</small></div></li>)}</ol>
            <div className="driver-card"><span className="avatar"><Ambulance /></span><div><small>Assigned unit</small><strong>{request.ambulanceId ?? "Not assigned"}</strong><span>{request.simulation ? "Synthetic request — no real driver contact" : "Awaiting authorized dispatch"}</span></div><button type="button" className="icon-button" aria-label="Driver contact unavailable" disabled><Phone /></button></div>
            <div className="simulation-controls">{!["COMPLETED", "CANCELLED"].includes(request.status) ? <><button className="button button-primary" type="button" onClick={advance} disabled={busy}>{busy ? "Updating…" : "Advance simulation"}<Navigation /></button><button className="button button-outline" type="button" onClick={cancel} disabled={busy}>Cancel simulation</button></> : <button className="button button-outline" type="button" onClick={() => setRequest(null)}><Route />Start another simulation</button>}</div>
          </div> : <div className="tracking-placeholder"><Route /><h2>Tracking waits for a request</h2><p></p></div>}
        </section>
      </div>
    </div>
  );
}
