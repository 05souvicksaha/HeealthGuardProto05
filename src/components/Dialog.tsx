import { X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Dialog({ open, title, description, className, onClose, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
      return;
    }
    if (!rendered) return;
    setClosing(true);
    const timer = window.setTimeout(() => { setRendered(false); setClosing(false); }, 190);
    return () => window.clearTimeout(timer);
  }, [open, rendered]);

  useEffect(() => {
    if (!open || !rendered) return;
    lastFocus.current = document.activeElement as HTMLElement;
    const app = document.getElementById("main-content");
    app?.setAttribute("inert", "");
    const dialog = dialogRef.current;
    const focusables = dialog?.querySelectorAll<HTMLElement>('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    (focusables?.[0] || dialog)?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab" || !focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      app?.removeAttribute("inert");
      lastFocus.current?.focus();
    };
  }, [open, rendered]);

  if (!rendered) return null;
  return createPortal(
    <div className={`dialog-backdrop${closing ? " closing" : ""}`} onMouseDown={(event) => event.currentTarget === event.target && open && closeRef.current()}>
      <div className={["dialog", className, closing ? "closing" : ""].filter(Boolean).join(" ")} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} ref={dialogRef} tabIndex={-1}>
        <header className="dialog-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <button className="icon-button" type="button" aria-label="Close dialog" onClick={() => closeRef.current()}><X /></button>
        </header>
        <div className="dialog-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
