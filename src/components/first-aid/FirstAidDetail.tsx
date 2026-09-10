import { Ban, Bookmark, Phone, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog } from "../Dialog";
import type { FirstAidCategory, FirstAidProtocol } from "../../types/firstAid";

export function FirstAidDetail({ protocol, category, saved, onClose, onBookmark, hospitalHref = "/hospitals?emergency=true", hospitalLabel = "Find an emergency hospital" }: {
  protocol: FirstAidProtocol | undefined; category: FirstAidCategory | undefined; saved: boolean;
  onClose: () => void; onBookmark: () => void; hospitalHref?: string; hospitalLabel?: string;
}) {
  return <Dialog open={Boolean(protocol)} title={protocol?.title ?? "First aid guidance"} description={category?.label} className="first-aid-detail" onClose={onClose}>
    {protocol ? <>
      <div className="first-aid-detail-actions"><span className={`first-aid-severity ${protocol.sev}`}>{protocol.sev} severity</span><button type="button" className="button button-outline" aria-pressed={saved} onClick={onBookmark}><Bookmark fill={saved ? "currentColor" : "none"} />{saved ? "Saved" : "Save guidance"}</button><a href="tel:112" className="button button-danger"><Phone />Call 112</a></div>
      <section className="first-aid-warning"><ShieldAlert aria-hidden="true" /><div><h3>Warning from the source</h3><p>{protocol.warn}</p></div></section>
      <section className="first-aid-immediate"><h3>In an emergency</h3><ol><li>Check that the scene is safe, then check the person’s response and breathing.</li><li>For a life-threatening condition, call 112, give your location and put the dispatcher on speaker.</li><li>Give care within your training and follow the dispatcher’s instructions.</li></ol><p className="first-aid-source-links">General first response: <a href="https://www.redcross.org/take-a-class/resources/articles/the-three-cs-of-first-aid-check-call-care" target="_blank" rel="noreferrer">Red Cross</a> · India emergency number: <a href="https://112.gov.in/" target="_blank" rel="noreferrer">112 India</a></p></section>
      <section className="first-aid-reference"><h3>Step-by-step source reference</h3><p className="first-aid-reference-note">This supplied reference has not been clinically validated by HealthGuard. It includes medicines and procedures that require trained professionals. Do not use it to self-prescribe or perform clinical procedures; a clinician must check it against current guidance.</p><ol>{protocol.steps.map((step, index) => <li key={index}>{step}</li>)}</ol></section>
      {protocol.donot.length ? <section className="first-aid-do-not"><h3><Ban aria-hidden="true" />Do not — source cautions</h3><ul>{protocol.donot.map((item, index) => <li key={index}>{item}</li>)}</ul></section> : null}
      <section className="first-aid-seek"><h3>When to seek professional help</h3><p>{protocol.seek}</p><Link to={hospitalHref} className="button button-outline">{hospitalLabel}</Link></section>
      <div className="first-aid-tags">{protocol.tags.map((tag, index) => <span className="tag" key={index}>{tag}</span>)}</div>
    </> : null}
  </Dialog>;
}
