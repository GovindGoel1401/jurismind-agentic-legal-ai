import { motion } from 'framer-motion'
import VerdictChart from './VerdictChart'
import { VerdictProbabilityItem } from './types'

interface VerdictPanelProps {
  enabled: boolean
}

const verdictProbabilities: VerdictProbabilityItem[] = [
  { label: 'User Win', value: 72, color: '#3B82F6' },
  { label: 'Opponent Win', value: 18, color: '#64748b' },
  { label: 'Settlement', value: 10, color: '#8B5CF6' },
]

export default function VerdictPanel({ enabled }: VerdictPanelProps) {
  const confidenceScore = 86

  return (
    <section className="rounded-xl border border-slate-700 bg-ai-panel p-6">
      <h2 className="text-xl font-semibold text-ai-text mb-4">Verdict Panel</h2>

      {!enabled ? (
        <p className="text-sm text-slate-400">Verdict will be generated once the judge agent completes reasoning.</p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-700 bg-ai-bg/70 p-4">
            <p className="text-sm text-slate-400 mb-1">Case Summary</p>
            <p className="text-ai-text text-sm">
              Dispute centers on rental deposit deduction without complete maintenance agreement records.
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-2">Verdict Probability</p>
            <VerdictChart data={verdictProbabilities} />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-300">Confidence Score</span>
              <span className="text-ai-text font-medium">{confidenceScore}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidenceScore}%` }}
                transition={{ duration: 0.8 }}
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-700 bg-ai-bg/70 p-4">
            <p className="text-sm text-slate-400 mb-1">Legal Reasoning Summary</p>
            <p className="text-ai-text text-sm">
              Defense claims are stronger due to limited prosecution documentation and missing contractual maintenance clauses.
            </p>
          </div>

          <div className="rounded-lg border border-violet-500/35 bg-violet-500/10 p-4">
            <p className="text-sm text-violet-300 mb-1">Recommended Action</p>
            <p className="text-ai-text text-sm">
              Attempt negotiated settlement first, while preparing evidence-backed claim for deposit recovery if talks fail.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
