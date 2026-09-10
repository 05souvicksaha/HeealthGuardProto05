import { Search, SlidersHorizontal, Stethoscope, X } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";

export function DoctorsPage() {
  const [query, setQuery] = useState("");
  return (
    <div className="page directory-page">
      <PageHeader title="Doctors" description="Search verified doctor profiles, specialties, affiliations, and availability." />
      <section className="directory-toolbar panel">
        <div className="search-field"><Search /><label className="sr-only" htmlFor="doctor-search">Search doctors</label><input id="doctor-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, specialty, or hospital" />{query ? <button type="button" aria-label="Clear doctor search" onClick={() => setQuery("")}><X /></button> : null}</div>
        <label className="select-field"><span>Specialty</span><select defaultValue=""><option value="">All specialties</option></select></label>
        <label className="select-field"><span>Availability</span><select defaultValue=""><option value="">Any availability</option></select></label>
        <button className="button button-outline" type="button" disabled title="More filters require a verified doctor dataset"><SlidersHorizontal />More filters</button>
      </section>
      <EmptyState title={query ? "No verified doctors match this search" : "No verified doctor data available"} message="A doctor schema and directory experience are ready, but no source dataset was supplied. HealthGuard will not invent clinicians, qualifications, registration numbers, or availability." action={query ? <button className="button button-outline" type="button" onClick={() => setQuery("")}>Clear search</button> : <span className="source-note"><Stethoscope />Connect a verified doctor dataset to populate this directory.</span>} />
    </div>
  );
}
