import {
  BadgeCheck, BedDouble, Building2, ChevronLeft, ChevronRight, Clock3,
  ExternalLink, MapPin, Phone, Search, ShieldCheck, Stethoscope, X
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { Dialog } from "../components/Dialog";
import { EmptyState, LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { useHealthData } from "../context/DataContext";
import type { Hospital } from "../types/health";
import { hospitalMatchesSpecialty, hospitalMatchesType, hospitalSpecialtyKeys, hospitalTypeLabel } from "../utils/hospitals";

const PAGE_SIZE = 6;

type SpecialtyStyle = CSSProperties & { "--specialty-color": string };
const specialtyStyle = (color: string) => ({ "--specialty-color": color }) as SpecialtyStyle;

export function HospitalsPage() {
  const { data, loading } = useHealthData();
  const [params, setParams] = useSearchParams();
  const committedQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(committedQuery);
  const [composing, setComposing] = useState(false);
  const [selected, setSelected] = useState<Hospital | null>(null);
  const type = params.get("type") ?? "all";
  const specialty = params.get("specialty") ?? "all";
  const emergency = params.get("emergency") === "true";
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);

  useEffect(() => setQuery(committedQuery), [committedQuery]);
  useEffect(() => {
    if (composing || query === committedQuery) return;
    const id = window.setTimeout(() => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        if (query.trim()) next.set("q", query.trim());
        else next.delete("q");
        next.set("page", "1");
        return next;
      });
    }, 300);
    return () => window.clearTimeout(id);
  }, [committedQuery, composing, query, setParams]);

  const specialtyPalette = useMemo(() => Object.entries(data?.categories ?? {}), [data]);
  const filtered = useMemo(() => {
    const needle = committedQuery.toLowerCase();
    return (data?.hospitals ?? []).filter((hospital) => {
      const mappedSpecialties = data ? hospitalSpecialtyKeys(hospital, data.categories, data.specialtyMap) : [];
      const specialtyText = mappedSpecialties.map((key) => `${data?.categories[key]?.label ?? key} ${data?.specialtyMap[key]?.specialist ?? ""}`).join(" ");
      const matchesQuery = !needle || `${hospital.name} ${hospital.address} ${hospital.specialties.join(" ")} ${specialtyText}`.toLowerCase().includes(needle);
      return matchesQuery
        && hospitalMatchesType(hospital, type)
        && hospitalMatchesSpecialty(hospital, specialty, data?.specialtyMap ?? {})
        && (!emergency || hospital.emergency);
    });
  }, [committedQuery, data, emergency, specialty, type]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selectedSpecialties = selected && data ? hospitalSpecialtyKeys(selected, data.categories, data.specialtyMap) : [];
  const mappedSourceSpecialties = new Set(selectedSpecialties.map((key) => data?.specialtyMap[key]?.spec ?? key));
  const additionalSourceSpecialties = selected?.specialties.filter((item) => !mappedSourceSpecialties.has(item)) ?? [];
  const selectedOpd = selected ? data?.opd[selected.name] : undefined;

  const setFilter = (key: string, value: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value && value !== "all") next.set(key, value);
      else next.delete(key);
      next.set("page", "1");
      return next;
    });
  };
  const clearAll = () => {
    setQuery("");
    setParams({ page: "1" });
  };
  const setPage = (value: number) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("page", String(value));
      return next;
    });
  };

  return (
    <div className="page directory-page hospital-directory-page">
      <PageHeader title="Hospitals" description="Source-backed hospital, emergency capability, specialty, and OPD information." actions={<span className="record-count">{data?.hospitals.length ?? 0} source records</span>} />

      <section className="directory-toolbar hospital-directory-toolbar panel" aria-label="Hospital filters">
        <div className="search-field"><Search /><label className="sr-only" htmlFor="hospital-search">Search hospital directory</label><input id="hospital-search" value={query} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onChange={(event) => setQuery(event.target.value)} placeholder="Search hospital, address, or specialty" />{query ? <button type="button" aria-label="Clear hospital search" onClick={() => { setQuery(""); setFilter("q", ""); }}><X /></button> : null}</div>
        <label className="select-field"><span>Type</span><select value={type} onChange={(event) => setFilter("type", event.target.value)}><option value="all">Government & private</option><option value="government">Government</option><option value="private">Private</option></select></label>
        <label className="check-filter"><input type="checkbox" checked={emergency} onChange={(event) => setFilter("emergency", event.target.checked ? "true" : "")} /><span><ShieldCheck />Emergency listed</span></label>
      </section>

      <section className="specialty-spectrum panel" aria-labelledby="specialty-spectrum-title">
        <header>
          <div><span className="specialty-spectrum-icon"><Stethoscope aria-hidden="true" /></span><div><h2 id="specialty-spectrum-title">Specialty spectrum</h2><p>Twenty source-mapped care categories, each with its own colour.</p></div></div>
          <button type="button" className={specialty === "all" ? "active" : ""} aria-pressed={specialty === "all"} onClick={() => setFilter("specialty", "all")}>All specialties</button>
        </header>
        <div className="specialty-spectrum-grid">
          {specialtyPalette.map(([key, category]) => (
            <button type="button" className={`specialty-filter${specialty === key ? " active" : ""}`} style={specialtyStyle(category.color)} aria-label={`Filter hospitals by ${category.label} specialty`} aria-pressed={specialty === key} onClick={() => setFilter("specialty", specialty === key ? "all" : key)} key={key}><i aria-hidden="true" />{category.label}</button>
          ))}
        </div>
      </section>

      {(committedQuery || type !== "all" || specialty !== "all" || emergency) ? <div className="active-filter-row"><span>{filtered.length} matching hospitals</span><button type="button" onClick={clearAll}>Clear all</button></div> : null}

      {loading ? <LoadingState label="Loading source-backed hospital records…" /> : visible.length ? (
        <div className="hospital-directory-list">
          {visible.map((hospital) => {
            const opd = data?.opd[hospital.name];
            const mappedSpecialties = data ? hospitalSpecialtyKeys(hospital, data.categories, data.specialtyMap) : [];
            const leadCategory = mappedSpecialties[0] ? data?.categories[mappedSpecialties[0]] : undefined;
            const hiddenSpecialties = Math.max(0, mappedSpecialties.length - 5);
            return (
              <article className="hospital-card" key={hospital.name}>
                <button className="hospital-card-link" type="button" onClick={() => setSelected(hospital)} aria-label={`Open ${hospital.name} profile`} />
                <span className="hospital-symbol large spectrum-symbol" style={leadCategory ? specialtyStyle(leadCategory.color) : undefined}><Building2 /></span>
                <div className="hospital-card-main">
                  <div className="hospital-title-line"><h2>{hospital.name}</h2><span className="tag hospital-type-tag">{hospitalTypeLabel(hospital.type)}</span><span className={hospital.emergency ? "tag tag-danger" : "tag tag-neutral"}>{hospital.emergency ? "Emergency listed" : "General care"}</span></div>
                  <p><MapPin />{hospital.address}</p>
                  <div className="specialty-list" aria-label={`${hospital.name} mapped specialties`}>
                    {mappedSpecialties.slice(0, 5).map((key) => {
                      const category = data?.categories[key];
                      return <span className="specialty-chip" style={specialtyStyle(category?.color ?? "#4d7f82")} key={key}><i aria-hidden="true" />{category?.label ?? key}</span>;
                    })}
                    {hiddenSpecialties ? <span className="specialty-more">+{hiddenSpecialties} more</span> : null}
                  </div>
                </div>
                <div className="hospital-card-aside"><span><Clock3 /><small>Weekday OPD</small><strong>{opd?.weekday ?? "Not supplied"}</strong></span><span><Phone /><small>Contact</small><strong>{hospital.phone ?? "Not supplied"}</strong></span></div>
                <ChevronRight className="row-chevron" aria-hidden="true" />
              </article>
            );
          })}
        </div>
      ) : <EmptyState title="No hospitals found" message="No source records match the current search and filters." action={<button className="button button-outline" type="button" onClick={clearAll}>Clear search and filters</button>} />}

      {filtered.length > PAGE_SIZE ? <nav className="pagination" aria-label="Hospital result pages"><button type="button" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} aria-label="Previous page"><ChevronLeft /></button><span>Page <strong>{safePage}</strong> of {totalPages} · {filtered.length} results</span><button type="button" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)} aria-label="Next page"><ChevronRight /></button></nav> : null}

      <Dialog open={Boolean(selected)} className="hospital-profile-dialog" title={selected?.name ?? "Hospital profile"} description="A source-backed facility profile with mapped care specialties and supplied OPD details." onClose={() => setSelected(null)}>
        {selected ? <div className="hospital-profile">
          <div className="hospital-profile-hero">
            <span className="hospital-profile-mark"><Building2 aria-hidden="true" /></span>
            <div className="hospital-profile-lead"><div><span className="hospital-profile-type"><BadgeCheck aria-hidden="true" />{hospitalTypeLabel(selected.type)}</span><span className={selected.emergency ? "hospital-profile-emergency active" : "hospital-profile-emergency"}><ShieldCheck aria-hidden="true" />{selected.emergency ? "Emergency capability listed" : "Emergency capability not listed"}</span></div><p><MapPin aria-hidden="true" />{selected.address}</p></div>
          </div>

          <div className="profile-facts">
            <div><BedDouble aria-hidden="true" /><span><small>Bed capacity</small><strong>{selected.beds ?? "Not supplied"}</strong></span></div>
            <div><Clock3 aria-hidden="true" /><span><small>Weekday OPD</small><strong>{selectedOpd?.weekday ?? "Not supplied"}</strong></span></div>
            <div><Phone aria-hidden="true" /><span><small>Contact</small><strong>{selected.phone ?? "Not supplied"}</strong></span></div>
          </div>

          <section className="hospital-profile-section hospital-profile-specialties">
            <header><div><span><Stethoscope aria-hidden="true" /></span><div><h3>Specialty spectrum</h3><p>{selectedSpecialties.length} matched from 20 source-mapped categories</p></div></div></header>
            <div className="hospital-profile-specialty-grid">
              {selectedSpecialties.map((key) => {
                const category = data?.categories[key];
                const mapping = data?.specialtyMap[key];
                return <span className="specialty-chip detailed" style={specialtyStyle(category?.color ?? "#4d7f82")} key={key}><i aria-hidden="true" /><span><strong>{category?.label ?? key}</strong><small>{mapping?.specialist ?? "Mapped specialty"}</small></span></span>;
              })}
            </div>
            {additionalSourceSpecialties.length ? <div className="additional-specialties"><small>Additional specialties in the hospital source record</small><div>{additionalSourceSpecialties.map((item) => <span key={item}>{item}</span>)}</div></div> : null}
          </section>

          <div className="hospital-profile-detail-grid">
            <section className="hospital-profile-section"><h3>About this hospital</h3><p>{selected.note ?? "No overview was supplied in the source record."}</p></section>
            <section className="hospital-profile-section opd-profile-section"><h3>OPD schedule</h3><dl><div><dt>Weekdays</dt><dd>{selectedOpd?.weekday ?? "Not supplied"}</dd></div><div><dt>Saturday</dt><dd>{selectedOpd?.saturday ?? "Not supplied"}</dd></div><div><dt>Sunday</dt><dd>{selectedOpd?.sunday ?? "Not supplied"}</dd></div></dl>{selectedOpd?.note ? <p>{selectedOpd.note}</p> : null}</section>
          </div>

          <section className="hospital-profile-section contact-profile-section"><h3>Contact and directions</h3><div><p><MapPin aria-hidden="true" />{selected.address}</p>{selected.phone ? <a href={`tel:${selected.phone.replace(/[^+\d]/g, "")}`}><Phone aria-hidden="true" />{selected.phone}</a> : <p><Phone aria-hidden="true" />Phone not supplied</p>}</div></section>
          <div className="dialog-actions"><button type="button" className="button button-outline" onClick={() => setSelected(null)}>Close profile</button><a className="button button-primary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selected.name} ${selected.address}`)}`}>Open directions <ExternalLink /></a></div>
        </div> : null}
      </Dialog>
    </div>
  );
}
