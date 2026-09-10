import { ArrowLeft, ArrowRight, BookOpen, MousePointerClick, RefreshCcw, Shuffle, Trophy } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { useApp } from "../context/AppContext";
import { useHealthData } from "../context/DataContext";
import { api } from "../services/api";
import type { Flashcard } from "../types/health";

type Mode = "flashcards" | "progress";

function shuffleDeck(cards: Flashcard[]) {
  const next = [...cards];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function ReferenceFlashcard({ card, color, flipped, order, onFlip }: { card: Flashcard; color: string; flipped: boolean; order: number; onFlip: () => void }) {
  const tilt = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    event.currentTarget.style.setProperty("--card-rotate-x", `${(y - .5) * -8}deg`);
    event.currentTarget.style.setProperty("--card-rotate-y", `${(x - .5) * 8}deg`);
    event.currentTarget.style.setProperty("--card-shine-x", `${x * 100}%`);
    event.currentTarget.style.setProperty("--card-shine-y", `${y * 100}%`);
  };
  const resetTilt = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.style.setProperty("--card-rotate-x", "0deg");
    event.currentTarget.style.setProperty("--card-rotate-y", "0deg");
  };
  return (
    <button type="button" className={`reference-flashcard${flipped ? " flipped" : ""}`} style={{ "--flashcard-accent": color, "--flashcard-delay": `${Math.min(order, 12) * 8 + 20}ms` } as CSSProperties} aria-pressed={flipped} aria-label={flipped ? `Show question: ${card.q}` : `Reveal answer: ${card.q}`} onClick={onFlip} onPointerMove={tilt} onPointerLeave={resetTilt}>
      <span className="reference-flashcard-shine" aria-hidden="true" />
      <span className="reference-flashcard-inner">
        <span className="reference-flashcard-face front"><span className="reference-flashcard-category">{card.cat}</span><strong>{card.q}</strong><small><MousePointerClick /> Tap to reveal answer</small></span>
        <span className="reference-flashcard-face back"><span className="reference-flashcard-category">Answer</span><strong>{card.a}</strong><small>Tap to return to the question</small></span>
      </span>
    </button>
  );
}

export function AcademyPage() {
  const { data, loading } = useHealthData();
  const { notify, playFeedback } = useApp();
  const [mode, setMode] = useState<Mode>("flashcards");
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [studied, setStudied] = useState<Set<string>>(new Set());
  const [savedAttempts, setSavedAttempts] = useState(0);
  const [shuffling, setShuffling] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const cards = useMemo(() => data?.flashcards ?? [], [data]);

  useEffect(() => { if (cards.length) setDeck(shuffleDeck(cards)); }, [cards]);
  useEffect(() => { api.get<{ total: number }>("/progress").then((value) => setSavedAttempts(value.total)).catch(() => undefined); }, []);

  const flipCard = (card: Flashcard) => {
    const key = `${card.cat}:${card.q}`;
    const revealing = !flipped.has(key);
    setFlipped((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
    playFeedback(500);
    if (!revealing || studied.has(key)) return;
    setStudied((current) => new Set(current).add(key));
    void api.post("/progress", { flashcardId: key, correct: 1, attempts: 1, lastStudiedAt: new Date().toISOString() }).then(() => setSavedAttempts((value) => value + 1)).catch(() => notify("Card studied, but progress could not be saved.", "warning"));
  };
  const shuffle = () => {
    if (shuffling) return;
    setShuffling(true); setFlipped(new Set());
    window.setTimeout(() => { setDeck(shuffleDeck(cards)); railRef.current?.scrollTo({ left: 0, behavior: "smooth" }); setShuffling(false); }, 180);
  };
  const scroll = (direction: -1 | 1) => railRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });

  return (
    <div className="page academy-page reference-academy-page">
      <PageHeader title="HealthGuard Academy" description="Tap, flip, and review source-backed emergency knowledge at your own pace." actions={<div className="academy-score"><Trophy /><span><strong>{studied.size}</strong><small>studied now · {savedAttempts} saved</small></span></div>} />
      <div className="academy-tabs" role="tablist" aria-label="Academy sections"><button type="button" role="tab" aria-selected={mode === "flashcards"} className={mode === "flashcards" ? "active" : ""} onClick={() => setMode("flashcards")}>Flashcards</button><button type="button" role="tab" aria-selected={mode === "progress"} className={mode === "progress" ? "active" : ""} onClick={() => setMode("progress")}>Progress</button></div>
      {loading ? <LoadingState label="Preparing Academy content…" /> : null}
      {!loading && mode === "flashcards" ? <section className="flashcard-deck" aria-labelledby="flashcard-deck-title">
        <div className="flashcard-deck-heading"><div><span>INTERACTIVE STUDY DECK</span><h2 id="flashcard-deck-title">Emergency flashcards</h2><p>Tap a card to flip it. Use the arrows, trackpad, touch, or keyboard to move through the deck.</p></div><strong>{deck.length} source cards</strong></div>
        <div className="flashcard-rail-shell"><button type="button" className="flashcard-scroll-button left" aria-label="Show previous flashcards" onClick={() => scroll(-1)}><ArrowLeft /></button><div className={`flashcard-rail${shuffling ? " shuffling" : ""}`} ref={railRef} tabIndex={0} aria-label="Emergency flashcard deck">{deck.map((card, index) => { const key = `${card.cat}:${card.q}`; return <ReferenceFlashcard key={key} card={card} color={data?.categories[card.cat]?.color ?? "#00e676"} flipped={flipped.has(key)} order={index} onFlip={() => flipCard(card)} />; })}</div><button type="button" className="flashcard-scroll-button right" aria-label="Show next flashcards" onClick={() => scroll(1)}><ArrowRight /></button></div>
        <div className="flashcard-deck-footer"><span>{studied.size} of {deck.length} viewed this session</span><button type="button" className={shuffling ? "spinning" : ""} disabled={shuffling} onClick={shuffle}><Shuffle /> Shuffle deck</button></div>
      </section> : null}
      {!loading && mode === "progress" ? <section className="progress-page panel"><span className="progress-emblem"><BookOpen /></span><h2>Your learning progress</h2><p>Opening an answer records a studied flashcard in your authenticated learning progress.</p><div className="progress-metrics"><div><strong>{studied.size}</strong><span>Studied this session</span></div><div><strong>{savedAttempts}</strong><span>Saved attempts</span></div><div><strong>{cards.length}</strong><span>Source flashcards</span></div></div><button className="button button-outline" type="button" onClick={() => { setStudied(new Set()); setFlipped(new Set()); notify("Session view reset; saved progress remains.", "info"); }}><RefreshCcw />Reset session view</button></section> : null}
    </div>
  );
}
