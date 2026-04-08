import { Link } from 'react-router-dom'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-slate-700 bg-legal-card px-5 py-6">
      <h3 className="text-lg font-semibold text-legal-text">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-legal-muted">{description}</p>
      {actionLabel && actionHref ? (
        <div className="mt-4">
          <Link to={actionHref} className="btn-legal">
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
