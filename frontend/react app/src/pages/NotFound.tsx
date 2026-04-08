import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, FileText } from 'lucide-react'

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="page-shell flex min-h-[70vh] items-center justify-center"
    >
      <div className="panel w-full max-w-2xl text-center">
        <h1 className="mb-4 text-6xl font-bold">
          <span className="text-legal-gold">404</span>
        </h1>
        <h2 className="mb-4 text-3xl font-bold text-legal-text">Page Not Found</h2>
        <p className="mx-auto mb-8 max-w-xl text-lg text-legal-muted">
          The page you requested is not part of the active JurisMind workflow or may have moved during the frontend cleanup.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="btn-legal inline-flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Back to Home
          </Link>
          <Link
            to="/case-input"
            className="btn-legal-outline inline-flex items-center gap-2"
          >
            <FileText size={18} />
            Start Case Input
          </Link>
        </div>
      </div>
    </motion.div>
  )
}
