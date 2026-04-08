import { motion } from 'framer-motion'

interface DebateMessageProps {
  speaker: 'defense' | 'prosecution' | 'judge'
  text: string
  delay: number
}

export default function DebateMessage({ speaker, text, delay }: DebateMessageProps) {
  const isDefense = speaker === 'defense'
  const isJudge = speaker === 'judge'

  const alignment = isDefense ? 'items-start' : isJudge ? 'items-center' : 'items-end'
  const bubbleStyle = isJudge
    ? 'bg-violet-500/15 border-violet-500/35 text-violet-100'
    : isDefense
      ? 'bg-blue-500/15 border-blue-500/35 text-blue-100'
      : 'bg-slate-600/20 border-slate-500/35 text-slate-100'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`flex ${alignment}`}
    >
      <div className={`max-w-[90%] rounded-2xl border px-4 py-3 text-sm ${bubbleStyle}`}>{text}</div>
    </motion.div>
  )
}
