import type { ReactNode } from "react";

export function PageHeader({ title, description, actions, headingLevel = 1 }: { title: string; description: string; actions?: ReactNode; headingLevel?: 1 | 2 }) {
  const Heading = headingLevel === 2 ? "h2" : "h1";
  return (
    <header className="page-header">
      <div>
        <Heading>{title}</Heading>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}
