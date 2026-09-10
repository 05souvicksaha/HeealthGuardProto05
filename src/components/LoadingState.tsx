import { LoaderCircle } from "lucide-react";

export function LoadingState({ label = "Loading care data…" }: { label?: string }) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <LoaderCircle className="spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <div className="state-panel state-empty">
      <strong>{title}</strong>
      <p>{message}</p>
      {action}
    </div>
  );
}
