import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Moon, Sun } from 'lucide-react'
import {
  CaseInputData,
  CaseInputPanel,
  DebatePanel,
  FeedbackForm,
  FeedbackPayload,
  PipelineVisualizer,
  SimilarCase,
  SimilarCaseCard,
  VerdictPanel,
} from '../components/workspace'

type AgentStatus = 'pending' | 'running' | 'completed'

interface PipelineAgent {
  key: string
  name: string
}

const pipelineAgents: PipelineAgent[] = [
  { key: 'case-interpreter', name: 'Case Interpreter' },
  { key: 'entity-extractor', name: 'Entity Extractor' },
  { key: 'evidence-analyzer', name: 'Evidence Analyzer' },
  { key: 'legal-research', name: 'Legal Research Agent' },
  { key: 'defense-agent', name: 'Defense Agent' },
  { key: 'prosecution-agent', name: 'Prosecution Agent' },
  { key: 'judge-agent', name: 'Judge Reasoning Agent' },
  { key: 'verdict-generator', name: 'Verdict Generator' },
]

const executionPlan: string[][] = [
  ['case-interpreter'],
  ['entity-extractor'],
  ['evidence-analyzer'],
  ['legal-research'],
  ['defense-agent', 'prosecution-agent'],
  ['judge-agent'],
  ['verdict-generator'],
]

const similarCases: SimilarCase[] = [
  {
    title: 'Ramesh vs Gupta',
    court: 'Delhi Rent Tribunal',
    year: 2019,
    similarityScore: 0.84,
    factSummary: 'No written maintenance agreement provided by landlord.',
    outcome: 'Tenant Won',
  },
  {
    title: 'Asha Mehta vs R.K. Estates',
    court: 'Mumbai Civil Court',
    year: 2021,
    similarityScore: 0.79,
    factSummary: 'Deposit deduction challenged due to missing repair proofs.',
    outcome: 'Partial Settlement',
  },
  {
    title: 'Sharma vs Prime Rentals',
    court: 'Bangalore Small Causes Court',
    year: 2018,
    similarityScore: 0.75,
    factSummary: 'Delayed refund and unsupported utility adjustments in dispute.',
    outcome: 'Tenant Won',
  },
]

function wait(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration))
}

export default function Workspace() {
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [pipelineStep, setPipelineStep] = useState(-1)
  const [activeExecutionIndex, setActiveExecutionIndex] = useState(-1)
  const [hasStarted, setHasStarted] = useState(false)
  const [currentCase, setCurrentCase] = useState<CaseInputData | null>(null)
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackPayload[]>([])

  const agentItems = useMemo(() => {
    return pipelineAgents.map((agent) => {
      let status: AgentStatus = 'pending'

      executionPlan.forEach((stepAgents, stepIndex) => {
        if (stepAgents.includes(agent.key)) {
          if (stepIndex < pipelineStep) {
            status = 'completed'
          } else if (stepIndex === activeExecutionIndex) {
            status = 'running'
          }
        }
      })

      if (pipelineStep >= executionPlan.length) {
        status = 'completed'
      }

      return {
        key: agent.key,
        name: agent.name,
        status,
      }
    })
  }, [pipelineStep, activeExecutionIndex])

  const debateEnabled = pipelineStep >= 5
  const verdictEnabled = pipelineStep >= executionPlan.length

  const runPipeline = async () => {
    setHasStarted(true)
    setPipelineStep(-1)

    for (let index = 0; index < executionPlan.length; index++) {
      setActiveExecutionIndex(index)
      await wait(index === 4 ? 1300 : 1000)
      setPipelineStep(index + 1)
    }

    setActiveExecutionIndex(-1)
  }

  const handleAnalyzeCase = async (payload: CaseInputData) => {
    setCurrentCase(payload)
    await runPipeline()
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-ai-bg text-ai-text">
        <header className="sticky top-0 z-50 border-b border-slate-700 bg-ai-panel/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold">
                ⚖
              </div>
              <p className="font-semibold text-ai-text">JurisMind AI</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 rounded-lg text-sm border border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
                onClick={() => document.getElementById('case-input-panel')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Case Input
              </button>
              <button
                className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800"
                onClick={() => setIsDarkMode((value) => !value)}
                aria-label="Toggle theme"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800"
                onClick={() => document.getElementById('feedback-panel')?.scrollIntoView({ behavior: 'smooth' })}
                aria-label="Feedback"
              >
                <MessageSquare size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <motion.div id="case-input-panel" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <CaseInputPanel onAnalyzeCase={handleAnalyzeCase} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <PipelineVisualizer agents={agentItems} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <DebatePanel enabled={debateEnabled} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
            <VerdictPanel enabled={verdictEnabled} />
          </motion.div>

          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-700 bg-ai-panel p-6"
          >
            <h2 className="text-xl font-semibold text-ai-text mb-4">Similar Cases Panel</h2>
            {!verdictEnabled ? (
              <p className="text-sm text-slate-400">Similar cases will appear after verdict generation.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {similarCases.map((item) => (
                  <SimilarCaseCard key={`${item.title}-${item.year}`} item={item} />
                ))}
              </div>
            )}
          </motion.section>

          <motion.section
            id="feedback-panel"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-700 bg-ai-panel p-6"
          >
            <h2 className="text-xl font-semibold text-ai-text mb-4">Feedback Panel</h2>
            {!verdictEnabled ? (
              <p className="text-sm text-slate-400">
                Feedback unlocks after verdict generation to complete the AI learning loop.
              </p>
            ) : (
              <>
                <p className="text-sm text-slate-400 mb-4">
                  This feedback is stored in local React state for now and will connect to a
                  learning backend later.
                </p>
                <FeedbackForm
                  onSubmitFeedback={(payload) => setFeedbackEntries((current) => [payload, ...current])}
                />

                {feedbackEntries.length > 0 && (
                  <div className="mt-5 rounded-lg border border-slate-700 bg-ai-bg/70 p-4">
                    <p className="text-sm text-slate-300">
                      Recent local feedback entries: {feedbackEntries.length}
                    </p>
                  </div>
                )}
              </>
            )}
          </motion.section>

          {hasStarted && currentCase && (
            <div className="text-xs text-slate-500 pb-3">
              Active case: {currentCase.category} · {currentCase.jurisdiction} · {currentCase.files.length} file(s)
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
