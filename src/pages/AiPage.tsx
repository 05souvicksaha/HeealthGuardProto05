import { ArrowRight, Bot, CircleAlert, LoaderCircle, MessageCircleMore, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { api } from "../services/api";

const promptSuggestions = [
  "What should I prepare before a hospital visit?",
  "How can I organise a family member's medication list?",
  "What details belong in an emergency health card?"
] as const;

export function AiPage() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const question = params.get("q")?.trim();
    if (question) setMessage(question);
  }, [params]);

  const ask = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = message.trim();
    if (!value || busy) return;
    setBusy(true);
    setError("");
    setReply("");
    try {
      const result = await api.post<{ answer?: string; content?: string }>("/ai/health-assistant", { message: value, history: [] });
      setReply(result.answer ?? result.content ?? "The configured provider returned no readable content.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "The HealthGuard assistant is unavailable right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page ai-page assistant-page">
      <PageHeader title="HealthGuard AI" description="One focused assistant for general health navigation, preparation, and record organisation." actions={<span className="service-status"><span />Provider status is always shown honestly</span>} />
      <section className="assistant-cockpit" aria-labelledby="assistant-workspace-title">
        <div className="assistant-atmosphere" aria-hidden="true"><i /><i /><i /></div>
        <header className="assistant-cockpit-header">
          <span className="assistant-core" aria-hidden="true"><Bot /><i /><i /></span>
          <div>
            <span className="assistant-eyebrow"><Sparkles /> HEALTHGUARD INTELLIGENCE</span>
            <h2 id="assistant-workspace-title">How can I help you today?</h2>
            <p>Ask a general health-navigation question. HealthGuard keeps provider limits visible and never presents an answer as a diagnosis.</p>
          </div>
          <span className="assistant-online"><i /> Assistant gateway</span>
        </header>
        <div className="assistant-safety-grid" aria-label="Assistant boundaries">
          <div><ShieldCheck /><span><strong>Privacy-aware</strong><small>Share only the details needed for your question.</small></span></div>
          <div><MessageCircleMore /><span><strong>Navigation focused</strong><small>Prepare questions, records, and next steps.</small></span></div>
          <div><CircleAlert /><span><strong>Not emergency care</strong><small>Call 112 for immediate danger.</small></span></div>
        </div>
        <div className="assistant-thread" aria-live="polite">
          {reply ? <article className="assistant-message assistant-message-provider"><span><Sparkles /></span><div><small>HEALTHGUARD ASSISTANT</small><p>{reply}</p></div></article> : <div className="assistant-empty"><span><Bot /></span><strong>Your assistant workspace is ready</strong><p>Choose a prompt below or write your own question.</p></div>}
          {error ? <div className="form-error-summary assistant-error" role="alert"><CircleAlert />{error}</div> : null}
        </div>
        <div className="assistant-suggestions" aria-label="Suggested questions">
          {promptSuggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => { setMessage(suggestion); setError(""); }}>{suggestion}</button>)}
        </div>
        <form className="assistant-composer" onSubmit={ask} noValidate>
          <label htmlFor="assistant-message">Ask HealthGuard</label>
          <div>
            <textarea className="resize-none" id="assistant-message" value={message} onChange={(event) => { setMessage(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={3} placeholder="Ask about preparing for care, organising records, or understanding next steps…" />
            <button className="assistant-send" type="submit" aria-label="Ask HealthGuard" disabled={busy || !message.trim()}>{busy ? <LoaderCircle className="spin" /> : <ArrowRight />}</button>
          </div>
          <p>Press Enter to send · Shift + Enter for a new line</p>
        </form>
      </section>
    </div>
  );
}
