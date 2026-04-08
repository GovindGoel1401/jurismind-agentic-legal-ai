import { FormEvent, useEffect, useState } from 'react'
import { MessageSquare, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface FeedbackDialogProps {
  isOpen: boolean
  onClose: () => void
}

const STORAGE_KEY = 'jurismind-platform-feedback'

export default function FeedbackDialog({ isOpen, onClose }: FeedbackDialogProps) {
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!message.trim()) return

    const entry = {
      id: Date.now().toString(),
      message: message.trim(),
      email: email.trim(),
      submittedAt: new Date().toISOString(),
    }

    const current = localStorage.getItem(STORAGE_KEY)
    const parsed = current ? (JSON.parse(current) as Array<typeof entry>) : []
    localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...parsed]))

    setMessage('')
    setEmail('')
    setSubmitted(true)
  }

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="fixed left-1/2 top-1/2 z-[70] w-[92%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-legal-gold/30 bg-legal-card p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-legal-gold" />
                <p className="text-base font-semibold text-legal-text">Share Feedback</p>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-legal-muted hover:bg-legal-panel hover:text-legal-text"
              >
                <X size={16} />
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <textarea
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value)
                  setSubmitted(false)
                }}
                maxLength={500}
                placeholder="What should we improve in the legal analysis experience?"
                className="min-h-32 w-full rounded-md border border-slate-700 bg-legal-panel px-3 py-2 text-sm text-legal-text outline-none focus:border-legal-blue"
              />
              <p className="text-xs text-legal-muted">{message.length}/500</p>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email (optional)"
                className="h-10 w-full rounded-md border border-slate-700 bg-legal-panel px-3 text-sm text-legal-text outline-none focus:border-legal-blue"
              />
              <button
                type="submit"
                disabled={message.trim().length === 0}
                className="inline-flex items-center rounded-md bg-legal-blue px-4 py-2 text-sm font-medium text-legal-text hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit
              </button>
            </form>

            {submitted && (
              <p className="mt-3 text-sm text-emerald-400">
                Feedback saved. Thanks for helping improve JurisMind AI.
              </p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
