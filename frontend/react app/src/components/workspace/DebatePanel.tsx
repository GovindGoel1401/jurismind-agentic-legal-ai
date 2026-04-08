import { motion } from 'framer-motion'
import DebateMessage from './DebateMessage'

interface DebatePanelProps {
  enabled: boolean
}

const defenseMessages = [
  'The tenant left the property without damage.',
  'No written maintenance agreement exists for additional charges.',
]

const prosecutionMessages = [
  'Landlord claims unpaid maintenance and cleanup costs.',
  'Repair invoices indicate post-tenancy restoration expenses.',
]

const judgeMessage = 'Defense argument appears stronger due to limited written evidence from prosecution.'

export default function DebatePanel({ enabled }: DebatePanelProps) {
  return (
    <section className="rounded-xl border border-slate-700 bg-ai-panel p-6">
      <h2 className="text-xl font-semibold text-ai-text mb-4">Debate Simulation</h2>

      {!enabled ? (
        <p className="text-sm text-slate-400">Debate will begin after legal research agents complete.</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-3">
              <p className="text-sm font-medium text-blue-300">Defense Agent</p>
              {defenseMessages.map((message, index) => (
                <DebateMessage key={message} speaker="defense" text={message} delay={index * 0.12} />
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-300 text-right">Prosecution Agent</p>
              {prosecutionMessages.map((message, index) => (
                <DebateMessage
                  key={message}
                  speaker="prosecution"
                  text={message}
                  delay={index * 0.12 + 0.15}
                />
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.45 }}
            className="pt-2"
          >
            <p className="text-sm font-medium text-violet-300 mb-2">Judge Observation</p>
            <DebateMessage speaker="judge" text={judgeMessage} delay={0.5} />
          </motion.div>
        </div>
      )}
    </section>
  )
}
