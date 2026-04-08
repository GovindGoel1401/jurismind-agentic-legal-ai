import { motion } from 'framer-motion'

interface DebateMessageProps {
  side: 'defense' | 'prosecution'
  text: string
  delay?: number
}

export default function DebateMessage({ side, text, delay = 0 }: DebateMessageProps) {
  const defense = side === 'defense'
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`flex ${defense ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className={`max-w-[95%] rounded-lg border px-3 py-2 text-sm ${
          defense
            ? 'border-legal-blue/40 bg-legal-blue/10 text-blue-100'
            : 'border-legal-bronze/40 bg-legal-bronze/10 text-amber-100'
        }`}
      >
        {text}
      </div>
    </motion.div>
  )
}
