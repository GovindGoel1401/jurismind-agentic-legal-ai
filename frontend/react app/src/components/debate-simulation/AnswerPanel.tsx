import { useEffect, useState } from 'react'
import type {
  DebateAnswerAnalysis,
  DebateAnswerReview,
  DebateQuestionWithAnalysis,
} from '../../services/caseService'

interface AnswerPanelProps {
  question: DebateQuestionWithAnalysis | null
  loading: boolean
  onApply: (payload: { selectedAnswerOptionId?: string; customAnswer?: string }) => void
  latestAnswerAnalysis: DebateAnswerAnalysis | null
  latestAnswerReview: DebateAnswerReview | null
}

export default function AnswerPanel({
  question,
  loading,
  onApply,
  latestAnswerAnalysis,
  latestAnswerReview,
}: AnswerPanelProps) {
  const [selectedOptionId, setSelectedOptionId] = useState('')
  const [customAnswer, setCustomAnswer] = useState('')

  useEffect(() => {
    setSelectedOptionId('')
    setCustomAnswer('')
  }, [question?.question_id])

  if (!question) {
    return (
      <section className="panel">
        <p className="text-sm text-legal-muted">Select a question to inspect suggested answers and apply a scenario update.</p>
      </section>
    )
  }

  const answerAnalysis = latestAnswerAnalysis || question.answer_analysis

  return (
    <section className="panel">
      <p className="text-xs uppercase tracking-[0.2em] text-legal-muted">Answer Panel</p>
      <h2 className="mt-1 text-xl font-semibold text-legal-text">{question.question}</h2>
      <p className="mt-3 text-sm leading-6 text-legal-muted">
        {question.rationale || question.why_this_question_matters}
      </p>

      <div className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-sky-100/80">Best-fit Answer</p>
        <p className="mt-2 text-sm font-medium leading-6 text-white">{answerAnalysis.best_fit_answer}</p>
        <p className="mt-2 text-sm leading-6 text-sky-100/80">{answerAnalysis.answer_reasoning}</p>
      </div>

      {latestAnswerReview ? (
        <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/80">Latest Answer Review</p>
          <p className="mt-2 text-sm font-medium text-white">{latestAnswerReview.summary}</p>
          <p className="mt-2 text-sm leading-6 text-emerald-100/80">{latestAnswerReview.notes}</p>

          {latestAnswerReview.new_facts.length ? (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-[0.14em] text-emerald-100/70">New facts</p>
              <ul className="mt-2 space-y-1 text-sm text-emerald-50">
                {latestAnswerReview.new_facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {latestAnswerReview.missing_evidence_signals.length ? (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-[0.14em] text-emerald-100/70">Missing evidence signals</p>
              <ul className="mt-2 space-y-1 text-sm text-emerald-50">
                {latestAnswerReview.missing_evidence_signals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {latestAnswerReview.contradictions.length ? (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-[0.14em] text-emerald-100/70">Contradictions</p>
              <ul className="mt-2 space-y-1 text-sm text-emerald-50">
                {latestAnswerReview.contradictions.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {answerAnalysis.answer_options.map((option) => (
          <label
            key={option.option_id}
            className={`block cursor-pointer rounded-2xl border px-4 py-4 ${
              selectedOptionId === option.option_id
                ? 'border-amber-400/40 bg-amber-400/10'
                : 'border-white/10 bg-white/[0.03]'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name={`answer-${question.question_id}`}
                checked={selectedOptionId === option.option_id}
                onChange={() => setSelectedOptionId(option.option_id)}
                className="mt-1"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-legal-text">{option.text}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.14em] ${
                      option.impact === 'strengthens'
                        ? 'bg-emerald-400/15 text-emerald-200'
                        : option.impact === 'weakens'
                          ? 'bg-rose-400/15 text-rose-200'
                          : 'bg-amber-400/15 text-amber-100'
                    }`}
                  >
                    {option.impact}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-legal-muted">{option.reasoning}</p>
              </div>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-5">
        <p className="text-xs uppercase tracking-[0.18em] text-legal-muted">Custom Answer</p>
        <textarea
          value={customAnswer}
          onChange={(event) => setCustomAnswer(event.target.value)}
          placeholder="Write how you would actually answer this question."
          className="mt-3 min-h-28 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-legal-text outline-none placeholder:text-legal-muted"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onApply({ selectedAnswerOptionId: selectedOptionId })}
          disabled={!selectedOptionId || loading}
          className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply Suggested Answer
        </button>
        <button
          type="button"
          onClick={() => onApply({ customAnswer })}
          disabled={!customAnswer.trim() || loading}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-legal-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          Analyze Custom Answer
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
        <span className="font-medium">Risk note:</span> {answerAnalysis.risk_note}
      </div>
    </section>
  )
}
