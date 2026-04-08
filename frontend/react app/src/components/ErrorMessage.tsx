import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'

interface ErrorMessageProps {
  title?: string
  message: string
  onRetry?: () => void
}

export default function ErrorMessage({
  title = 'Error',
  message,
  onRetry,
}: ErrorMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-500/10 border border-red-500/50 rounded-lg p-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="text-red-500 flex-shrink-0 mt-1" size={20} />
        <div className="flex-1">
          <h3 className="font-semibold text-red-400">{title}</h3>
          <p className="text-red-300 text-sm mt-1">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm text-red-400 hover:text-red-300 underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
