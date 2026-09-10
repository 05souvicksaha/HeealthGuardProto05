import { Activity, Ambulance, CheckCircle2, LocateFixed, Navigation, Radio, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { useApp } from "../context/AppContext";
import { api } from "../services/api";

interface DriverRequest {
  id: string;
  pickup: string | { label?: string };
  destinationHospitalId: string;
  priority: string;
  status: string;
  simulation: boolean;
  etaMinutes?: number;
  driverId?: string;
}
interface DriverPayload { driver: { id: string; ambulanceId?: string; status: string } | null; items: DriverRequest[] }

const nextStatus: Record<string, string> = {
  ASSIGNED: "EN_ROUTE_PICKUP",
  EN_ROUTE_PICKUP: "ARRIVED_PICKUP",
  ARRIVED_PICKUP: "EN_ROUTE_HOSPITAL",
  EN_ROUTE_HOSPITAL: "COMPLETED"
};

export function DriverPage() {
  const { notify } = useApp();
  const [payload, setPayload] = useState<DriverPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try { setPayload(await api.get<DriverPayload>("/drivers/me/requests")); }
    catch (error) { notify(error instanceof Error ? error.message : "Driver requests could not be loaded.", "error"); }
    finally { setLoading(false); }
  }, [notify]);
  useEffect(() => { void load(); }, [load]);

  const accept = async (id: string) => {
    setBusy(id);
    try { await api.post(`/drivers/me/requests/${id}/accept`); notify("Ambulance request assigned.", "success"); await load(); }
    catch (error) { notify(error instanceof Error ? error.message : "Request could not be accepted.", "error"); }
    finally { setBusy(""); }
  };
  const advance = async (request: DriverRequest) => {
    const status = nextStatus[request.status];
    if (!status) return;
    setBusy(request.id);
    try { await api.patch(`/drivers/me/requests/${request.id}/status`, { status }); notify(`Status updated to ${status.replaceAll("_", " ").toLowerCase()}.`, "success"); await load(); }
    catch (error) { notify(error instanceof Error ? error.message : "Status could not be updated.", "error"); }
    finally { setBusy(""); }
  };
  const shareLocation = (requestId: string) => {
    if (!navigator.geolocation) return notify("Location is unavailable in this browser.", "error");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try { await api.post("/drivers/me/location", { requestId, latitude: coords.latitude, longitude: coords.longitude }); notify("Location shared for this request.", "success"); }
      catch (error) { notify(error instanceof Error ? error.message : "Location could not be shared.", "error"); }
    }, () => notify("Location permission was denied or timed out.", "warning"), { timeout: 7000, enableHighAccuracy: true });
  };

  return (
    <div className="page driver-page">
      <PageHeader title="Driver operations" description="Authorized assignment, status, and location updates for ambulance requests." actions={<button type="button" className="button button-outline" onClick={load}><RefreshCcw />Refresh</button>} />
      <div className="operations-status"><Radio /><div><strong>{payload?.driver ? "Driver profile connected" : "Driver profile missing"}</strong><span>{payload?.driver?.ambulanceId ? `Ambulance ${payload.driver.ambulanceId}` : "An administrator must associate an ambulance before real operations."}</span></div></div>
      {loading ? <LoadingState label="Loading dispatch queue…" /> : payload?.items.length ? (
        <div className="dispatch-list">{payload.items.map((request) => (
          <article className="dispatch-item panel" key={request.id}>
            <header><span className="dispatch-icon"><Ambulance /></span><div><small>{request.simulation ? "SIMULATION REQUEST" : "REQUEST"}</small><h2>{request.priority} priority</h2></div><em>{request.status.replaceAll("_", " ")}</em></header>
            <dl><div><dt>Pickup</dt><dd>{typeof request.pickup === "string" ? request.pickup : request.pickup.label ?? "Coordinates supplied"}</dd></div><div><dt>Destination</dt><dd>{request.destinationHospitalId}</dd></div></dl>
            <footer>
              {request.status === "REQUESTED" ? <button type="button" className="button button-primary" disabled={busy === request.id} onClick={() => accept(request.id)}><CheckCircle2 />{busy === request.id ? "Assigning…" : "Accept request"}</button> : null}
              {nextStatus[request.status] ? <button type="button" className="button button-primary" disabled={busy === request.id} onClick={() => advance(request)}><Navigation />{busy === request.id ? "Updating…" : `Mark ${nextStatus[request.status].replaceAll("_", " ").toLowerCase()}`}</button> : null}
              {request.driverId && !["COMPLETED", "CANCELLED"].includes(request.status) ? <button type="button" className="button button-outline" onClick={() => shareLocation(request.id)}><LocateFixed />Share location</button> : null}
            </footer>
          </article>
        ))}</div>
      ) : <EmptyState title="No dispatch requests" message="New authorized ambulance requests will appear here. No assignment or location has been fabricated." action={<span className="source-note"><Activity />Waiting for server-confirmed work.</span>} />}
    </div>
  );
}

