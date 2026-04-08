import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FileText,
  Brain,
  Zap,
  Scale,
  Copy,
  UserCheck,
  MessageSquare,
  X,
  ChevronRight,
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose?: () => void
}

const menuItems = [
  {
    id: 'case-input',
    label: 'Case Input',
    href: '/case-input',
    icon: FileText,
    badge: 'New',
  },
  {
    id: 'ai-analysis',
    label: 'AI Analysis',
    href: '/analysis',
    icon: Brain,
    badge: null,
  },
  {
    id: 'debate',
    label: 'Debate Simulation',
    href: '/debate',
    icon: Zap,
    badge: 'Beta',
  },
  {
    id: 'verdict',
    label: 'Verdict',
    href: '/verdict',
    icon: Scale,
    badge: null,
  },
  {
    id: 'similar-cases',
    label: 'Similar Cases',
    href: '/similar-cases',
    icon: Copy,
    badge: null,
  },
  {
    id: 'lawyer-review',
    label: 'Lawyer Review',
    href: '/lawyer-review/demo-case-001',
    icon: UserCheck,
    badge: null,
  },
  {
    id: 'feedback',
    label: 'Feedback',
    href: '/feedback',
    icon: MessageSquare,
    badge: null,
  },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : '-100%',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed lg:static left-0 top-16 h-screen lg:h-[calc(100vh-64px)] w-64 bg-gradient-to-b from-primary-900 to-primary-950 border-r border-primary-800/50 z-40 lg:z-auto overflow-y-auto"
      >
        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg hover:bg-primary-800 transition-colors text-primary-300 hover:text-gold-400"
        >
          <X size={20} />
        </button>

        {/* Logo on mobile */}
        <div className="lg:hidden px-6 py-4 border-b border-primary-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-gold-500 to-gold-600 rounded-lg flex items-center justify-center">
              <span className="text-primary-950 font-bold">⚖</span>
            </div>
            <span className="text-lg font-bold text-gold-400">JurisMind</span>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive =
              location.pathname === item.href ||
              (item.id === 'ai-analysis' && location.pathname.startsWith('/analysis')) ||
              (item.id === 'debate' && location.pathname.startsWith('/debate')) ||
              (item.id === 'verdict' && location.pathname.startsWith('/verdict')) ||
              (item.id === 'similar-cases' &&
                location.pathname.startsWith('/similar-cases')) ||
              (item.id === 'lawyer-review' &&
                location.pathname.startsWith('/lawyer-review/')) ||
              (item.id === 'feedback' && location.pathname.startsWith('/feedback'))

            return (
              <Link
                key={item.id}
                to={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-300 group relative ${
                  isActive
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                    : 'text-primary-300 hover:text-gold-400 hover:bg-primary-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className="flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </div>

                {/* Badge */}
                {item.badge && (
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      item.badge === 'New'
                        ? 'bg-green-500/20 text-green-400'
                        : item.badge === 'Beta'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gold-500/20 text-gold-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Active indicator */}
                {isActive && (
                  <ChevronRight
                    size={18}
                    className="text-gold-400 group-hover:translate-x-1 transition-transform"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-primary-800/50 bg-gradient-to-t from-primary-950 to-transparent">
          <div className="mb-4 p-4 bg-primary-800/30 rounded-lg border border-gold-500/20">
            <p className="text-sm font-semibold text-gold-400 mb-2">✨ Pro Features</p>
            <p className="text-xs text-primary-300 mb-3">
              Unlock advanced analysis and collaboration tools.
            </p>
            <button className="w-full px-3 py-2 bg-gradient-to-r from-gold-500 to-gold-600 text-primary-950 font-semibold rounded-lg hover:shadow-lg hover:shadow-gold-500/50 transition-all duration-300 text-sm">
              Upgrade Now
            </button>
          </div>
          <p className="text-xs text-primary-500 text-center">v1.0.0</p>
        </div>
      </motion.aside>
    </>
  )
}
