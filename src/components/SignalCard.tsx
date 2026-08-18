import type { ReactNode } from 'react';

type IconTone = 'blue' | 'green' | 'yellow' | 'red' | 'purple';

function CardInfo({ text }: { text: string }) {
  return (
    <button type="button" className="info-trigger" title="How is this calculated?" aria-label="How is this calculated?">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4M12 8h.01"/>
      </svg>
      <span className="info-tooltip" role="tooltip">{text}</span>
    </button>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return <p className="card-tip"><strong>Reduce it:</strong> {children}</p>;
}

export function SignalCard({
  icon,
  iconTone,
  title,
  info,
  status,
  explanation,
  tip,
  loading = false,
  loadingLabel = 'Loading...',
  children,
}: {
  icon: ReactNode;
  iconTone: IconTone;
  title: string;
  info: string;
  status?: ReactNode;
  explanation: string;
  tip: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">
          <div className={`card-icon ${iconTone}`}>{icon}</div>
          <h3>{title}<CardInfo text={info} /></h3>
        </div>
        {status}
      </div>
      <div className="card-content">
        {loading ? (
          <div className="loading"><div className="spinner"></div> {loadingLabel}</div>
        ) : children}
      </div>
      <p className="card-explanation">{explanation}</p>
      <Tip>{tip}</Tip>
    </div>
  );
}
