import { ArrowRight, Bookmark, BriefcaseMedical } from "lucide-react";
import type { CSSProperties } from "react";
import type { FirstAidCategory, FirstAidProtocol } from "../../types/firstAid";

export function FirstAidCard({ protocol, category, saved, onOpen, onBookmark }: {
  protocol: FirstAidProtocol; category: FirstAidCategory; saved: boolean;
  onOpen: () => void; onBookmark: () => void;
}) {
  return <article className="first-aid-card panel" style={{ "--aid-category": category.color } as CSSProperties}>
    <div className="first-aid-card-top"><span className="first-aid-category-icon"><BriefcaseMedical aria-hidden="true" /></span><span className={`first-aid-severity ${protocol.sev}`}>{protocol.sev}</span><button className="icon-button" type="button" aria-label={`${saved ? "Unsave" : "Save"} ${protocol.title}`} aria-pressed={saved} onClick={onBookmark}><Bookmark fill={saved ? "currentColor" : "none"} /></button></div>
    <span className="first-aid-category-name">{category.label}</span>
    <h2><button type="button" onClick={onOpen}>{protocol.title}</button></h2>
    <p>{protocol.tags.join(" · ")}</p>
    <div className="first-aid-card-bottom"><span>{protocol.steps.length} reference steps</span><button className="button button-outline" type="button" onClick={onOpen} aria-label={`Open ${protocol.title} guidance`}>View guidance <ArrowRight aria-hidden="true" /></button></div>
  </article>;
}
