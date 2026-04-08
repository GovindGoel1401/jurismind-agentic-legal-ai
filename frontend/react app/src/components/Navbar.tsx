import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Menu, MessageSquare, Moon, Scale, Sun, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { primaryNavigation } from '../config/navigation'
import { resolveCaseAwareHref } from '../utils/caseRoute'
import { useActiveCase } from '../context/ActiveCaseContext'

interface NavbarProps {
  isDarkMode?: boolean
  onThemeToggle?: () => void
}

export default function Navbar({
  isDarkMode = true,
  onThemeToggle,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { activeCaseId } = useActiveCase()
  const resolveHref = (href: string) =>
    resolveCaseAwareHref(href, location.pathname, activeCaseId)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b border-legal-gold/20 bg-legal-panel/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <NavLink to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-legal-gold/40 bg-legal-card">
            <Scale size={16} className="text-legal-gold" />
          </span>
          <span className="text-sm font-semibold tracking-wide text-legal-text sm:text-base">
            JurisMind AI
          </span>
        </NavLink>

        <div className="hidden items-center gap-1 lg:flex">
          {primaryNavigation.map((link) => (
            <NavLink
              key={link.href}
              to={resolveHref(link.href)}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-legal-blue/20 text-legal-text'
                    : 'text-legal-muted hover:bg-legal-card hover:text-legal-text'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onThemeToggle}
            aria-label="Toggle theme"
            className="rounded-md p-2 text-legal-muted transition-colors hover:bg-legal-card hover:text-legal-text"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <NavLink
            to={resolveHref('/feedback')}
            aria-label="Open feedback page"
            className="hidden items-center gap-2 rounded-md border border-legal-gold/35 bg-legal-card px-3 py-2 text-sm text-legal-gold transition-colors hover:bg-legal-gold/10 sm:inline-flex"
          >
            <MessageSquare size={16} />
            Feedback
          </NavLink>
          <button
            onClick={() => setMobileOpen((current) => !current)}
            aria-label="Toggle navigation menu"
            className="rounded-md p-2 text-legal-muted transition-colors hover:bg-legal-card hover:text-legal-text lg:hidden"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <>
          <button
            aria-label="Close navigation menu"
            className="fixed inset-0 top-16 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="relative z-50 border-t border-legal-gold/15 bg-legal-panel lg:hidden"
          >
            <div className="space-y-1 px-2 py-3">
              {primaryNavigation.map((link) => (
                <NavLink
                  key={link.href}
                  to={resolveHref(link.href)}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm ${
                      isActive
                        ? 'bg-legal-blue/20 text-legal-text'
                        : 'text-legal-muted hover:bg-legal-card hover:text-legal-text'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <NavLink
                to={resolveHref('/feedback')}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-legal-gold transition-colors hover:bg-legal-gold/10"
              >
                <MessageSquare size={16} />
                Feedback
              </NavLink>
            </div>
          </motion.div>
        </>
      )}
    </nav>
  )
}
