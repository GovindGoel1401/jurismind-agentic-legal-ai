import type { DebateQuestion } from '../../services/caseService'

interface QuestionPanelProps {
  questionSets?: {
    defense: DebateQuestion[]
    prosecution: DebateQuestion[]
  }
  questions: DebateQuestion[]
  selectedQuestionId: string
  searchValue: string
  onSearchChange: (value: string) => void
  onSelect: (questionId: string) => void
}

export default function QuestionPanel({
  questionSets,
  questions,
  selectedQuestionId,
  searchValue,
  onSearchChange,
  onSelect,
}: QuestionPanelProps) {
  const filtered = questions.filter((question) => {
    if (!searchValue.trim()) return true
    const haystack = `${question.question} ${question.linked_issue_or_evidence} ${question.why_this_question_matters}`.toLowerCase()
    return haystack.includes(searchValue.toLowerCase())
  })

  const groups = [
    {
      title: 'Defense Questions',
      role: 'defense',
    },
    {
      title: 'Prosecution Questions',
      role: 'prosecution',
    },
  ] as const

  return (
    <section className="panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-legal-muted">Question Panel</p>
          <h2 className="text-xl font-semibold text-legal-text">Cross-questioning map</h2>
        </div>
        <input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search questions"
          className="w-full max-w-xs rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-legal-text outline-none placeholder:text-legal-muted"
        />
      </div>

      <div className="mt-5 space-y-5">
        {groups.map((group) => {
          const sourceItems =
            questionSets?.[group.role] && questionSets[group.role].length
              ? questionSets[group.role]
              : filtered.filter((question) => question.role === group.role)
          const items = sourceItems.filter((question) => {
            if (!searchValue.trim()) return true
            const haystack = `${question.question} ${question.linked_issue_or_evidence} ${question.why_this_question_matters}`.toLowerCase()
            return haystack.includes(searchValue.toLowerCase())
          })

          return (
            <div key={group.role}>
              <p className="text-xs uppercase tracking-[0.18em] text-legal-muted">{group.title}</p>
              <div className="mt-3 space-y-3">
                {items.map((question) => (
                  <button
                    key={question.question_id}
                    type="button"
                    onClick={() => onSelect(question.question_id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      selectedQuestionId === question.question_id
                        ? 'border-amber-400/40 bg-amber-400/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-legal-muted">
                        {question.linked_issue_or_evidence}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.14em] ${
                          question.priority === 'high'
                            ? 'bg-rose-400/15 text-rose-200'
                            : question.priority === 'low'
                              ? 'bg-emerald-400/15 text-emerald-200'
                              : 'bg-amber-400/15 text-amber-100'
                        }`}
                      >
                        {question.priority || 'medium'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium leading-6 text-legal-text">{question.question}</p>
                    <p className="mt-2 text-sm leading-6 text-legal-muted">
                      {question.rationale || question.why_this_question_matters}
                    </p>
                  </button>
                ))}
                {items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-legal-muted">
                    No questions match the current filter.
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
