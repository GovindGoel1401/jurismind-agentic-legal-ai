import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { RefreshCw, Swords } from 'lucide-react'
import AnswerPanel from '../components/debate-simulation/AnswerPanel'
import QuestionPanel from '../components/debate-simulation/QuestionPanel'
import ScenarioUpdatePanel from '../components/debate-simulation/ScenarioUpdatePanel'
import ErrorMessage from '../components/ErrorMessage'
import EmptyState from '../components/shared/EmptyState'
import InfoCard from '../components/shared/InfoCard'
import PageHeader from '../components/shared/PageHeader'
import CaseWorkflowStepper from '../components/shared/CaseWorkflowStepper'
import { useAnalysisWorkspace } from '../hooks/useAnalysisWorkspace'
import { useCaseStageRedirect } from '../hooks/useCaseStageRedirect'
import caseService from '../services/caseService'
import type {
  DebateAnswerAnalysis,
  DebateAnswerReview,
  DebateQuestion,
  DebateQuestionWithAnalysis,
  DebateScenarioUpdate,
  DebateSessionMemory,
  DebateSimulationApplyAnswerResponse,
  DebateSimulationSessionResponse,
} from '../services/caseService'
import { getApiErrorMessage } from '../services/api'
import { clearDebateSession, getDebateSession, saveDebateSession } from '../utils/debateSession'

interface StoredDebateWorkspace {
  debate_session_id?: string
  status?: string
  current_focus?: string
  current_question?: DebateQuestion | null
  question_sets?: {
    defense: DebateQuestion[]
    prosecution: DebateQuestion[]
  }
  question_bank: DebateQuestionWithAnalysis[]
  session_memory: DebateSessionMemory
  latest_scenario_update?: DebateScenarioUpdate | null
  latest_answer_analysis?: DebateAnswerAnalysis | null
  last_answer_review?: DebateAnswerReview | null
  unresolved_issues?: Array<{
    issue: string
    priority: string
    source: string
  }>
}

function buildExpectedSessionId(category: string, jurisdiction: string, caseId?: string) {
  if (caseId) return `debate-${caseId}`
  const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `debate-${slug(category || 'general')}-${slug(jurisdiction || 'unknown')}`
}

function formatPercent(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return 'Unavailable'
  return `${Math.round(Number(value) * 100)}%`
}

export default function DebateSimulation() {
  const { caseId: routeCaseId } = useParams()
  const caseId = useCaseStageRedirect('/debate', routeCaseId)
  const {
    latestAnalysis,
    caseContext,
    workflowState,
    hasStoredCase,
    hasStoredAnalysis,
    loading: workspaceLoading,
  } = useAnalysisWorkspace(caseId)
  const [questionBank, setQuestionBank] = useState<DebateQuestionWithAnalysis[]>([])
  const [sessionMemory, setSessionMemory] = useState<DebateSessionMemory | null>(null)
  const [latestScenarioUpdate, setLatestScenarioUpdate] = useState<DebateScenarioUpdate | null>(null)
  const [latestAnswerAnalysis, setLatestAnswerAnalysis] = useState<DebateAnswerAnalysis | null>(null)
  const [latestAnswerReview, setLatestAnswerReview] = useState<DebateAnswerReview | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedQuestion = useMemo(() => {
    if (sessionMemory?.current_question?.question_id) {
      return (
        questionBank.find((question) => question.question_id === sessionMemory.current_question?.question_id) ||
        sessionMemory.current_question ||
        questionBank[0] ||
        null
      )
    }
    if (!sessionMemory?.selected_question_id) return questionBank[0] || null
    return (
      questionBank.find((question) => question.question_id === sessionMemory.selected_question_id) ||
      questionBank[0] ||
      null
    )
  }, [questionBank, sessionMemory])

  const questionSets = useMemo(() => {
    if (sessionMemory?.question_sets) {
      return sessionMemory.question_sets
    }
    return {
      defense: questionBank.filter((question) => question.role === 'defense'),
      prosecution: questionBank.filter((question) => question.role === 'prosecution'),
    }
  }, [questionBank, sessionMemory?.question_sets])

  const persistWorkspace = (
    nextQuestionBank: DebateQuestionWithAnalysis[],
    nextSessionMemory: DebateSessionMemory,
    scenarioUpdate: DebateScenarioUpdate | null,
    answerAnalysis: DebateAnswerAnalysis | null,
    answerReview: DebateAnswerReview | null,
  ) => {
    saveDebateSession({
      debate_session_id: nextSessionMemory.debate_session_id || nextSessionMemory.session_id,
      status: nextSessionMemory.status,
      current_focus: nextSessionMemory.current_focus,
      current_question: nextSessionMemory.current_question,
      question_sets: nextSessionMemory.question_sets,
      question_bank: nextQuestionBank,
      session_memory: nextSessionMemory,
      latest_scenario_update: scenarioUpdate,
      latest_answer_analysis: answerAnalysis,
      last_answer_review: answerReview,
      unresolved_issues: nextSessionMemory.unresolved_issues,
    })
  }

  const applyDebateSnapshot = (
    data: StoredDebateWorkspace | DebateSimulationSessionResponse | DebateSimulationApplyAnswerResponse,
  ) => {
    const nextSessionMemory = data.session_memory
    const nextQuestionBank =
      data.question_bank ||
      nextSessionMemory?.question_bank ||
      nextSessionMemory?.generated_questions ||
      []
    const nextScenarioUpdate =
      'latest_scenario_update' in data
        ? data.latest_scenario_update || null
        : 'scenario_update' in data
          ? data.scenario_update
          : null
    const nextAnswerAnalysis =
      'latest_answer_analysis' in data
        ? data.latest_answer_analysis || null
        : 'answer_analysis' in data
          ? data.answer_analysis
          : null
    const nextAnswerReview = data.last_answer_review || nextSessionMemory?.last_answer_review || null

    setQuestionBank(nextQuestionBank)
    setSessionMemory(nextSessionMemory)
    setLatestScenarioUpdate(nextScenarioUpdate)
    setLatestAnswerAnalysis(nextAnswerAnalysis)
    setLatestAnswerReview(nextAnswerReview)
    persistWorkspace(
      nextQuestionBank,
      nextSessionMemory,
      nextScenarioUpdate,
      nextAnswerAnalysis,
      nextAnswerReview,
    )
  }

  const initializeSession = async (reset = false) => {
    if (!latestAnalysis) return

    setLoading(true)
    setError('')

    try {
      const backendDebate = ((workflowState as { debate?: StoredDebateWorkspace } | null)?.debate ||
        null) as StoredDebateWorkspace | null
      if (
        !reset &&
        backendDebate?.question_bank?.length &&
        backendDebate?.session_memory?.session_id
      ) {
        applyDebateSnapshot(backendDebate)
        setLoading(false)
        return
      }

      if (!reset) {
        const stored = getDebateSession<StoredDebateWorkspace>()
        const expectedSessionId = buildExpectedSessionId(caseContext.category, caseContext.jurisdiction, caseId)
        if (
          stored?.question_bank?.length &&
          stored?.session_memory?.session_id &&
          stored.session_memory.session_id === expectedSessionId
        ) {
          applyDebateSnapshot(stored)
          setLoading(false)
          return
        }
      } else {
        clearDebateSession()
        setLatestScenarioUpdate(null)
        setLatestAnswerAnalysis(null)
        setLatestAnswerReview(null)
      }

      const response = caseId
        ? await caseService.startCaseDebate(caseId, { reset })
        : await caseService.initializeDebateSimulation({
            case_input: caseContext as unknown as Record<string, unknown>,
            analysis: (latestAnalysis || {}) as Record<string, unknown>,
            verdict: ((latestAnalysis?.verdict || {}) as Record<string, unknown>),
            similar_case_intelligence: ((latestAnalysis?.similarCaseIntelligence ||
              latestAnalysis?.verdict?.similar_case_intelligence ||
              {}) as Record<string, unknown>),
            session_memory: null,
          })

      applyDebateSnapshot(response)
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Unable to initialize the debate simulation right now.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!hasStoredAnalysis || !latestAnalysis || workspaceLoading) return
    initializeSession()
  }, [hasStoredAnalysis, latestAnalysis, workspaceLoading])

  const handleSelectQuestion = async (questionId: string) => {
    if (!sessionMemory) return

    setError('')

    if (caseId) {
      setLoading(true)
      try {
        const response = await caseService.selectCaseDebateQuestion(caseId, {
          question_id: questionId,
        })
        applyDebateSnapshot(response)
      } catch (caughtError) {
        setError(getApiErrorMessage(caughtError, 'Unable to select that debate question right now.'))
      } finally {
        setLoading(false)
      }
      return
    }

    const localQuestion =
      questionBank.find((question) => question.question_id === questionId) || null
    const nextSessionMemory = {
      ...sessionMemory,
      current_question_id: questionId,
      selected_question_id: questionId,
      current_question: localQuestion,
    }
    setSessionMemory(nextSessionMemory)
    persistWorkspace(questionBank, nextSessionMemory, latestScenarioUpdate, latestAnswerAnalysis, latestAnswerReview)
  }

  const handleApplyAnswer = async ({
    selectedAnswerOptionId,
    customAnswer,
  }: {
    selectedAnswerOptionId?: string
    customAnswer?: string
  }) => {
    if (!selectedQuestion || !sessionMemory) return

    setLoading(true)
    setError('')

    try {
      const response = caseId
        ? await caseService.answerCaseDebate(caseId, {
            question_id: selectedQuestion.question_id,
            selected_answer_option_id: selectedAnswerOptionId,
            custom_answer: customAnswer,
          })
        : await caseService.applyDebateAnswer({
            question_id: selectedQuestion.question_id,
            selected_answer_option_id: selectedAnswerOptionId,
            custom_answer: customAnswer,
            session_memory: sessionMemory as unknown as Record<string, unknown>,
          })

      applyDebateSnapshot(response)
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError, 'Unable to apply that answer right now.'))
    } finally {
      setLoading(false)
    }
  }

  if (workspaceLoading) {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="Phase 5" title="Debate Simulation" description="Loading case workspace..." />
      </div>
    )
  }

  if (!hasStoredCase) {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Phase 5"
          title="Debate Simulation"
          description="Interactive legal preparation and cross-questioning workspace."
        />
        <section className="panel mt-6">
          <EmptyState
            title="No active case selected"
            description="Create or select a case first so JurisMind can open the debate workspace for the current session."
            actionLabel="Start Case Analysis"
            actionHref="/case-input"
          />
        </section>
      </div>
    )
  }

  if (!hasStoredAnalysis || !latestAnalysis) {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Phase 5"
          title="Debate Simulation"
          description="Interactive legal preparation and cross-questioning workspace."
        />
        <section className="panel mt-6">
          <EmptyState
            title="Analysis not completed for this case yet"
            description="Debate uses the saved case analysis and verdict context. Complete analysis for this active case before opening the simulator."
            actionLabel="Open Analysis"
            actionHref={caseId ? `/analysis/${caseId}` : '/analysis'}
          />
        </section>
      </div>
    )
  }

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="Phase 5"
        title="Debate Simulation"
        description={`Interactive cross-questioning and scenario evolution for ${caseId || caseContext.category}.`}
      />

      <CaseWorkflowStepper />

      <section className="relative overflow-hidden rounded-[28px] border border-sky-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.2),_transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6">
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-sky-100">
              <Swords size={13} />
              Interactive Case Evolution
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-white">Prepare both sides, test answers, and watch the scenario move.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Questions are generated from live evidence gaps, contradiction signals, verdict risks, and similar-case gaps. Each answer updates the current case debate state instead of acting like a separate chat.
            </p>
          </div>

          <button
            type="button"
            onClick={() => initializeSession(true)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Reset Simulation
          </button>
        </div>
      </section>

      {error ? (
        <ErrorMessage title="Debate Simulation" message={error} onRetry={() => void initializeSession()} />
      ) : null}

      {sessionMemory ? (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <InfoCard
              label="Turns Answered"
              value={String(sessionMemory.answer_history?.length || sessionMemory.turns?.length || 0)}
              detail="Stored in the current case debate session."
            />
            <InfoCard
              label="Current Win Probability"
              value={formatPercent(sessionMemory.working_state?.win_probability)}
              detail="Updated after each selected or custom answer."
            />
            <InfoCard
              label="Confidence Score"
              value={formatPercent(sessionMemory.working_state?.confidence_score)}
              detail="How stable the current simulated position looks."
            />
            <InfoCard
              label="Unresolved Issues"
              value={String(sessionMemory.unresolved_issues?.length || 0)}
              detail="Open gaps still driving the next question set."
            />
          </section>

          <section className="panel">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-legal-muted">Current focus</p>
                <p className="mt-2 text-sm leading-7 text-legal-text">
                  {sessionMemory.current_focus || 'The simulator is focusing on the highest-priority open issue.'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-legal-muted">Unresolved issues</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(sessionMemory.unresolved_issues || []).slice(0, 6).map((issue) => (
                    <span
                      key={`${issue.source}-${issue.issue}`}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-legal-text"
                    >
                      {issue.priority}: {issue.issue}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
        <QuestionPanel
          questions={questionBank}
          questionSets={questionSets}
          selectedQuestionId={sessionMemory?.current_question_id || sessionMemory?.selected_question_id || ''}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          onSelect={(questionId) => void handleSelectQuestion(questionId)}
        />

        <AnswerPanel
          question={selectedQuestion}
          loading={loading}
          onApply={handleApplyAnswer}
          latestAnswerAnalysis={latestAnswerAnalysis}
          latestAnswerReview={latestAnswerReview}
        />
      </div>

      <ScenarioUpdatePanel scenarioUpdate={latestScenarioUpdate} sessionMemory={sessionMemory} />

      <section className="panel">
        <div className="flex flex-wrap gap-3">
          <Link
            to={latestAnalysis?.caseMeta?.case_id ? `/knowledge-graph/${latestAnalysis.caseMeta.case_id}` : '/knowledge-graph'}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-legal-text"
          >
            Open Knowledge Graph
          </Link>
          <Link
            to={latestAnalysis?.caseMeta?.case_id ? `/verdict/${latestAnalysis.caseMeta.case_id}` : '/verdict'}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-legal-text"
          >
            Back To Verdict
          </Link>
          <Link
            to={latestAnalysis?.caseMeta?.case_id ? `/feedback/${latestAnalysis.caseMeta.case_id}` : '/feedback'}
            className="btn-legal"
          >
            Continue To Feedback
          </Link>
        </div>
      </section>
    </div>
  )
}
