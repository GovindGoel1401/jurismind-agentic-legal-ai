import { Link, useLocation } from 'react-router-dom'
import { resolveCaseAwareHref } from '../../utils/caseRoute'
import { useActiveCase } from '../../context/ActiveCaseContext'

interface StepItem {
  label: string
  href: string
}

const stageSteps: StepItem[] = [
  { label: 'Case Input', href: '/case-input' },
  { label: 'Analysis', href: '/analysis' },
  { label: 'Similar Cases', href: '/similar-cases' },
  { label: 'Knowledge Graph', href: '/knowledge-graph' },
  { label: 'Verdict', href: '/verdict' },
  { label: 'Debate', href: '/debate' },
  { label: 'Feedback', href: '/feedback' },
]

function matchesStep(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function CaseWorkflowStepper() {
  const location = useLocation()
  const { activeCaseId } = useActiveCase()

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-legal-muted">Case Workflow</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {stageSteps.map((step, index) => {
          const resolvedHref = resolveCaseAwareHref(step.href, location.pathname, activeCaseId)
          const active = matchesStep(location.pathname, step.href)

          return (
            <Link
              key={step.href}
              to={resolvedHref}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? 'border-legal-gold/50 bg-legal-gold/15 text-amber-100'
                  : 'border-white/10 bg-black/20 text-legal-muted hover:border-white/20 hover:text-legal-text'
              }`}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current/30 text-[10px]">
                {index + 1}
              </span>
              {step.label}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
