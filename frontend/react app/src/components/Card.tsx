import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  variant?: 'default' | 'elevated' | 'outlined'
}

export default function Card({
  children,
  className = '',
  onClick,
  variant = 'default',
}: CardProps) {
  const variants = {
    default: 'bg-legal-card border border-slate-700 hover:border-legal-gold/40',
    elevated: 'bg-legal-panel border border-legal-gold/20 shadow-lg shadow-black/20',
    outlined: 'bg-transparent border border-legal-gold/35',
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ y: 0 }}
      onClick={onClick}
      className={`rounded-lg p-6 transition-all duration-300 ${variants[variant]} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </motion.div>
  )
}
