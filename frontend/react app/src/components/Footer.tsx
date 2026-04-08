import { Link, useLocation } from 'react-router-dom'
import { Mail, MapPin, Phone, Scale } from 'lucide-react'
import { footerPlatformNavigation } from '../config/navigation'
import { resolveCaseAwareHref } from '../utils/caseRoute'
import { useActiveCase } from '../context/ActiveCaseContext'

export default function Footer() {
  const year = new Date().getFullYear()
  const location = useLocation()
  const { activeCaseId } = useActiveCase()
  const resolveHref = (href: string) => resolveCaseAwareHref(href, location.pathname, activeCaseId)

  return (
    <footer className="border-t border-legal-gold/20 bg-legal-panel/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-legal-gold/35 bg-legal-card">
              <Scale size={16} className="text-legal-gold" />
            </span>
            <p className="text-sm font-semibold tracking-wide text-legal-text">JurisMind AI</p>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-legal-muted">
            Legal intelligence platform for structured case analysis, agent-based reasoning, and
            verdict simulation.
          </p>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-legal-gold">
            Platform
          </p>
          <div className="space-y-2 text-sm">
            {footerPlatformNavigation.map((link) => (
              <Link key={link.href} to={resolveHref(link.href)} className="block text-legal-muted hover:text-legal-text">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-legal-gold">
            Contact
          </p>
          <div className="space-y-2 text-sm text-legal-muted">
            <p className="flex items-center gap-2">
              <Mail size={14} className="text-legal-gold" />
              support@jurismind.ai
            </p>
            <p className="flex items-center gap-2">
              <Phone size={14} className="text-legal-gold" />
              +1 (800) 529-7424
            </p>
            <p className="flex items-center gap-2">
              <MapPin size={14} className="text-legal-gold" />
              San Francisco, CA
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-legal-gold/15 px-4 py-4 text-center text-xs text-legal-muted">
        {year} JurisMind AI. AI outputs are informational and not legal advice.
      </div>
    </footer>
  )
}
