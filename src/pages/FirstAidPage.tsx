import { Bookmark, BriefcaseMedical, ChevronLeft, ChevronRight, Phone, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/LoadingState";
import { FirstAidCard } from "../components/first-aid/FirstAidCard";
import { FirstAidDetail } from "../components/first-aid/FirstAidDetail";
import { FIRST_AID_BOOKMARK_KEY, filterFirstAidProtocols, firstAidCategories, firstAidCategoryCounts, firstAidProtocols, parseFirstAidBookmarks } from "../data/firstAidProtocols";
import "./first-aid.css";

const PAGE_SIZE = 12;
export default function FirstAidPage({ publicMode = false }: { publicMode?: boolean }) {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const category = params.get("category") ?? "all";
  const severity = params.get("severity") ?? "all";
  const savedOnly = params.get("saved") === "true";
  const selected = firstAidProtocols.find((item) => item.id === params.get("protocol"));
  const searchRef = useRef<HTMLInputElement>(null);
  const [storageError, setStorageError] = useState("");
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try { return parseFirstAidBookmarks(localStorage.getItem(FIRST_AID_BOOKMARK_KEY)); } catch { return []; }
  });
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === FIRST_AID_BOOKMARK_KEY) setBookmarks(parseFirstAidBookmarks(event.newValue)); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    if (publicMode) document.title = "Emergency support — HealthGuard";
  }, [publicMode]);
  const filtered = useMemo(() => filterFirstAidProtocols(query, category, severity, savedOnly, bookmarks), [query, category, severity, savedOnly, bookmarks]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const setFilter = (key: string, value: string) => setParams((current) => {
    const next = new URLSearchParams(current);
    if (value && value !== "all") next.set(key, value); else next.delete(key);
    if (key !== "page" && key !== "protocol") next.delete("page");
    return next;
  }, { replace: key === "q" });
  const toggleBookmark = (id: string) => {
    const next = bookmarks.includes(id) ? bookmarks.filter((entry) => entry !== id) : [...bookmarks, id];
    setBookmarks(next);
    try { localStorage.setItem(FIRST_AID_BOOKMARK_KEY, JSON.stringify(next)); setStorageError(""); }
    catch { setStorageError("Bookmarks work for this visit, but your browser could not save them. Allow site storage to keep them after reloading."); }
  };
  return <div className="page first-aid-page">
    <PageHeader title={publicMode ? "Emergency support" : "First Aid Guidance"} description="Find structured reference information for injuries and medical emergencies." actions={<a className="button button-danger" href="tel:112"><Phone aria-hidden="true" />Call 112</a>} />
    <section className="first-aid-intro panel"><BriefcaseMedical aria-hidden="true" /><div><strong>Find the guidance you need</strong><p>Search {firstAidProtocols.length} supplied protocols across {Object.keys(firstAidCategories).length} categories. In immediate danger, call 112 and follow the dispatcher’s instructions.</p></div><Link className="button button-outline" to={publicMode ? "/" : "/emergency"}>{publicMode ? "Back to HealthGuard" : "Emergency center"}</Link></section>
    <section className="directory-toolbar panel first-aid-toolbar" aria-label="First aid filters">
      <div className="search-field"><Search aria-hidden="true" /><label className="sr-only" htmlFor="first-aid-search">Search first aid guidance</label><input ref={searchRef} id="first-aid-search" value={query} placeholder="Search a condition, symptom or keyword…" onChange={(event) => setFilter("q", event.target.value)} />{query ? <button type="button" aria-label="Clear first aid search" onClick={() => { setFilter("q", ""); searchRef.current?.focus(); }}><X /></button> : null}</div>
      <div className="select-field"><label htmlFor="first-aid-severity">Severity</label><select id="first-aid-severity" value={severity} onChange={(event) => setFilter("severity", event.target.value)}><option value="all">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="moderate">Moderate</option><option value="low">Low</option></select></div>
      <button type="button" className={`button button-outline${savedOnly ? " active" : ""}`} aria-pressed={savedOnly} onClick={() => setFilter("saved", savedOnly ? "" : "true")}><Bookmark aria-hidden="true" />Saved ({bookmarks.length})</button>
    </section>
    <section className="first-aid-categories panel" aria-labelledby="first-aid-categories-title"><header><div><h2 id="first-aid-categories-title">Browse by category</h2><p>Choose a specialty to narrow your search.</p></div><button className="button button-outline" type="button" aria-pressed={category === "all"} onClick={() => setFilter("category", "all")}>All categories</button></header><div className="first-aid-category-grid">{Object.entries(firstAidCategories).map(([key, item]) => <button type="button" key={key} style={{ "--aid-category": item.color } as CSSProperties} aria-pressed={category === key} onClick={() => setFilter("category", category === key ? "all" : key)}><i aria-hidden="true" /><span>{item.label}</span><small>{firstAidCategoryCounts[key]}</small></button>)}</div></section>
    {storageError ? <p className="first-aid-storage-error" role="status">{storageError}</p> : null}
    <div className="first-aid-results-heading"><p role="status">{filtered.length ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} protocols` : "No matching protocols"}</p><button type="button" className="button button-ghost" onClick={() => setParams({})}>Reset filters</button></div>
    {visible.length ? <section className="first-aid-grid" aria-label="First aid protocols">{visible.map((protocol) => <FirstAidCard key={protocol.id} protocol={protocol} category={firstAidCategories[protocol.cat]} saved={bookmarks.includes(protocol.id)} onOpen={() => setFilter("protocol", protocol.id)} onBookmark={() => toggleBookmark(protocol.id)} />)}</section> : <EmptyState title={savedOnly ? "No saved guidance matches" : "No guidance found"} message="Try a different keyword, category or severity." action={<button className="button button-outline" type="button" onClick={() => setParams({})}>Clear filters</button>} />}
    {pages > 1 ? <nav className="pagination" aria-label="First aid pages"><button type="button" aria-label="Previous first aid page" disabled={page === 1} onClick={() => setFilter("page", String(page - 1))}><ChevronLeft /></button><span>Page {page} of {pages}</span><button type="button" aria-label="Next first aid page" disabled={page === pages} onClick={() => setFilter("page", String(page + 1))}><ChevronRight /></button></nav> : null}
    <p className="first-aid-provenance">Educational source reference. Some entries describe professional medical treatment and require clinical review. HealthGuard does not verify diagnoses or replace emergency services.</p>
    <FirstAidDetail protocol={selected} category={selected ? firstAidCategories[selected.cat] : undefined} saved={selected ? bookmarks.includes(selected.id) : false} onClose={() => setFilter("protocol", "")} onBookmark={() => { if (selected) toggleBookmark(selected.id); }} />
  </div>;
}
