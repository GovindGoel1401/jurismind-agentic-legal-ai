import { ReactNode } from 'react'

interface InfoCardProps {
  label: string
  value: ReactNode
  detail?: ReactNode
}

export default function InfoCard({ label, value, detail }: InfoCardProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-legal-card px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-legal-muted">{label}</p>
      <div className="mt-1 text-sm font-medium text-legal-text">{value}</div>
      {detail ? <div className="mt-2 text-xs text-legal-muted">{detail}</div> : null}
    </div>
  )
}
