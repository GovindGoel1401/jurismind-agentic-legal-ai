import { FormEvent, useMemo, useState } from 'react'
import { MessageSquarePlus, Send } from 'lucide-react'
import caseService, { FeedbackType } from '../../services/caseService'
import { getApiErrorMessage } from '../../services/api'
import { Label } from '../ui/Label'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'

interface StructuredFeedbackPanelProps {
  caseId: string
  sessionId?: string
  phaseContext: string
  linkedFeature: string
  linkedOutputReference?: string
  caseInput?: Record<string, unknown>
  verdictSnapshot?: Record<string, unknown>
  recommendationSnapshot?: unknown
  debateSessionSnapshot?: unknown
  title?: string
  description?: string
  onSubmitted?: (entry: {
    feedbackType: FeedbackType
    summary: string
    phaseContext: string
    linkedFeature: string
    rating?: number
  }) => void
}

const feedbackTypeOptions: Array<{ label: string; value: FeedbackType }> = [
  { label: 'Advice usefulness', value: 'advice_usefulness' },
  { label: 'Correctness concern', value: 'answer_correctness_concern' },
  { label: 'Updated case fact', value: 'updated_case_fact' },
  { label: 'Missing context provided later', value: 'missing_context_provided_later' },
  { label: 'Actual case outcome', value: 'actual_case_outcome' },
  { label: 'General comment', value: 'user_comment' },
]

function parseHelpfulChoice(value: string) {
  if (value === 'yes') return true
  if (value === 'no') return false
  return undefined
}

function buildIssueTags(rawValue: string, defaults: string[]) {
  const extra = rawValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return Array.from(new Set([...defaults, ...extra]))
}

export default function StructuredFeedbackPanel({
  caseId,
  sessionId = '',
  phaseContext,
  linkedFeature,
  linkedOutputReference = '',
  caseInput = {},
  verdictSnapshot = {},
  recommendationSnapshot,
  debateSessionSnapshot,
  title = 'Share contextual feedback',
  description = 'Attach structured feedback to this exact part of the product so it can be audited and used safely later.',
  onSubmitted,
}: StructuredFeedbackPanelProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('advice_usefulness')
  const [rating, setRating] = useState('4')
  const [details, setDetails] = useState('')
  const [secondary, setSecondary] = useState('')
  const [issueTagsText, setIssueTagsText] = useState('')
  const [analysisHelpful, setAnalysisHelpful] = useState('skip')
  const [verdictHelpful, setVerdictHelpful] = useState('skip')
  const [debateHelpful, setDebateHelpful] = useState('skip')
  const [documentGuidanceHelpful, setDocumentGuidanceHelpful] = useState('skip')
  const [similarCasesHelpful, setSimilarCasesHelpful] = useState('skip')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const secondaryLabel = useMemo(() => {
    if (feedbackType === 'actual_case_outcome') return 'Actual outcome, duration, cost, or result details'
    if (feedbackType === 'updated_case_fact') return 'What fact changed?'
    if (feedbackType === 'missing_context_provided_later') return 'What missing context should have been known earlier?'
    if (feedbackType === 'answer_correctness_concern') return 'Which assumption or answer looked incorrect?'
    return 'Optional structured detail'
  }, [feedbackType])

  const derivedIssueTags = useMemo(
    () => buildIssueTags(issueTagsText, [phaseContext, linkedFeature, feedbackType].filter(Boolean)),
    [issueTagsText, phaseContext, linkedFeature, feedbackType],
  )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!details.trim()) return

    setSubmitting(true)
    setMessage('')

    try {
      await caseService.submitFeedback({
        case_id: caseId,
        session_id: sessionId,
        phase_context: phaseContext,
        feedback_type: feedbackType,
        linked_feature_or_agent: linkedFeature,
        linked_output_reference: linkedOutputReference,
        user_rating: Number(rating),
        verdict_helpful: parseHelpfulChoice(verdictHelpful),
        analysis_helpful: parseHelpfulChoice(analysisHelpful),
        debate_helpful: parseHelpfulChoice(debateHelpful),
        document_guidance_helpful: parseHelpfulChoice(documentGuidanceHelpful),
        similar_cases_helpful: parseHelpfulChoice(similarCasesHelpful),
        issue_tags: derivedIssueTags,
        comment: details.trim(),
        case_signature: {
          case_type: String(caseInput?.category || ''),
          jurisdiction: String(caseInput?.jurisdiction || ''),
          evidence_level: String(caseInput?.evidence_level || ''),
          doc_completeness: Number(caseInput?.doc_completeness || caseInput?.completeness_score || 0),
        },
        payload: {
          advice_usefulness_rating:
            feedbackType === 'advice_usefulness' ? Number(rating) : undefined,
          correctness_concern:
            feedbackType === 'answer_correctness_concern' ? details.trim() : undefined,
          fact_update: feedbackType === 'updated_case_fact' ? details.trim() : undefined,
          missing_context:
            feedbackType === 'missing_context_provided_later' ? details.trim() : undefined,
          actual_outcome: feedbackType === 'actual_case_outcome' ? details.trim() : undefined,
          user_comment: details.trim(),
          secondary_detail: secondary.trim(),
          verdict_accuracy:
            feedbackType === 'answer_correctness_concern'
              ? 'incorrect'
              : undefined,
        },
        tags: derivedIssueTags,
        metadata: {
          case_input: caseInput,
          ai_verdict: verdictSnapshot,
          recommendation_snapshot: recommendationSnapshot,
          debate_session_snapshot: debateSessionSnapshot,
        },
      })

      onSubmitted?.({
        feedbackType,
        summary: details.trim(),
        phaseContext,
        linkedFeature,
        rating: Number(rating),
      })

      setMessage('Feedback sent to the separate feedback intelligence layer.')
      setDetails('')
      setSecondary('')
      setIssueTagsText('')
      setRating('4')
      setAnalysisHelpful('skip')
      setVerdictHelpful('skip')
      setDebateHelpful('skip')
      setDocumentGuidanceHelpful('skip')
      setSimilarCasesHelpful('skip')
    } catch (caughtError) {
      setMessage(getApiErrorMessage(caughtError, 'Unable to send feedback right now.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel">
      <div className="flex items-center gap-3">
        <MessageSquarePlus size={18} className="text-amber-300" />
        <div>
          <h3 className="text-lg font-semibold text-legal-text">{title}</h3>
          <p className="text-sm text-legal-muted">{description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <Label className="mb-2 block">Feedback type</Label>
          <Select
            value={feedbackType}
            onChange={(event) => setFeedbackType(event.target.value as FeedbackType)}
            options={feedbackTypeOptions}
          />
        </div>

        <div>
          <Label className="mb-2 block">Overall rating</Label>
          <Select
            value={rating}
            onChange={(event) => setRating(event.target.value)}
            options={[
              { label: '5 - Very useful', value: '5' },
              { label: '4 - Useful', value: '4' },
              { label: '3 - Mixed', value: '3' },
              { label: '2 - Limited', value: '2' },
              { label: '1 - Not useful', value: '1' },
            ]}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="mb-2 block">Analysis helpful?</Label>
            <Select
              value={analysisHelpful}
              onChange={(event) => setAnalysisHelpful(event.target.value)}
              options={[
                { label: 'Skip', value: 'skip' },
                { label: 'Yes', value: 'yes' },
                { label: 'No', value: 'no' },
              ]}
            />
          </div>
          <div>
            <Label className="mb-2 block">Verdict helpful?</Label>
            <Select
              value={verdictHelpful}
              onChange={(event) => setVerdictHelpful(event.target.value)}
              options={[
                { label: 'Skip', value: 'skip' },
                { label: 'Yes', value: 'yes' },
                { label: 'No', value: 'no' },
              ]}
            />
          </div>
          <div>
            <Label className="mb-2 block">Debate helpful?</Label>
            <Select
              value={debateHelpful}
              onChange={(event) => setDebateHelpful(event.target.value)}
              options={[
                { label: 'Skip', value: 'skip' },
                { label: 'Yes', value: 'yes' },
                { label: 'No', value: 'no' },
              ]}
            />
          </div>
          <div>
            <Label className="mb-2 block">Document guidance helpful?</Label>
            <Select
              value={documentGuidanceHelpful}
              onChange={(event) => setDocumentGuidanceHelpful(event.target.value)}
              options={[
                { label: 'Skip', value: 'skip' },
                { label: 'Yes', value: 'yes' },
                { label: 'No', value: 'no' },
              ]}
            />
          </div>
          <div>
            <Label className="mb-2 block">Similar cases helpful?</Label>
            <Select
              value={similarCasesHelpful}
              onChange={(event) => setSimilarCasesHelpful(event.target.value)}
              options={[
                { label: 'Skip', value: 'skip' },
                { label: 'Yes', value: 'yes' },
                { label: 'No', value: 'no' },
              ]}
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Primary detail</Label>
          <Textarea
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Explain what helped, what was wrong, what changed, or what outcome occurred."
          />
        </div>

        <div>
          <Label className="mb-2 block">{secondaryLabel}</Label>
          <Textarea
            value={secondary}
            onChange={(event) => setSecondary(event.target.value)}
            placeholder="Optional structured detail for auditability."
          />
        </div>

        <div>
          <Label className="mb-2 block">Issue tags</Label>
          <Textarea
            value={issueTagsText}
            onChange={(event) => setIssueTagsText(event.target.value)}
            placeholder="Comma-separated tags like missing_document_guidance, weak_debate_followup"
          />
          <p className="mt-2 text-xs text-legal-muted">
            Current tags: {derivedIssueTags.join(', ')}
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting || !details.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          <Send size={14} />
          Submit feedback
        </button>

        {message ? <p className="text-sm text-legal-muted">{message}</p> : null}
      </form>
    </section>
  )
}
