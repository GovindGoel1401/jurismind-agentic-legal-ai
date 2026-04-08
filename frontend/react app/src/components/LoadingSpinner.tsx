import { motion } from 'framer-motion'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

export default function LoadingSpinner({ size = 'md', message }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`border-4 border-primary-700 border-t-gold-500 rounded-full ${sizeClasses[size]}`}
    >
      {message && (
        <div className="text-center mt-4 text-primary-300">{message}</div>
      )}
    </motion.div>
  )
}
