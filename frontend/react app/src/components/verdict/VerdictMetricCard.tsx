import { ReactNode } from 'react'

interface VerdictMetricCardProps {
  eyebrow: string
  title: string
  value: ReactNode
  detail: string
  tone?: 'default' | 'highlight' | 'muted'
}

const toneClasses: Record<NonNullable<VerdictMetricCardProps['tone']>, string> = {
  default: 'border-white/10 bg-white/5',
  highlight: 'border-amber-400/30 bg-amber-400/10',
  muted: 'border-slate-700 bg-slate-900/70',
}

export default function VerdictMetricCard({
  eyebrow,
  title,
  value,
  detail,
  tone = 'default',
}: VerdictMetricCardProps) {
  return (
    <article className={`rounded-2xl border p-5 ${toneClasses[tone]}`}>
      <p className="text-[11px] uppercase tracking-[0.24em] text-legal-muted">{eyebrow}</p>
      <h3 className="mt-2 text-sm font-medium text-legal-muted">{title}</h3>
      <div className="mt-3 text-2xl font-semibold text-legal-text">{value}</div>
      <p className="mt-3 text-sm leading-relaxed text-legal-muted">{detail}</p>
    </article>
  )
}
