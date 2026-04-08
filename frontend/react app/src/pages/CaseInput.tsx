import { DragEvent, FormEvent, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { AlertCircle, FileText, Loader2, Upload, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import DocumentChecklistPanel from '../components/case-input/DocumentChecklistPanel'
import EvidenceInventoryTable from '../components/case-input/EvidenceInventoryTable'
import ReadinessSummaryCard from '../components/case-input/ReadinessSummaryCard'
import ErrorMessage from '../components/ErrorMessage'
import PageHeader from '../components/shared/PageHeader'
import CaseWorkflowStepper from '../components/shared/CaseWorkflowStepper'
import { Label } from '../components/ui/Label'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import caseService from '../services/caseService'
import { getApiErrorMessage } from '../services/api'
import { useActiveCase } from '../context/ActiveCaseContext'
import {
  buildAnalyzePayloadDocuments,
  buildDocumentPreview,
  buildStoredDocumentPreview,
} from '../features/caseInput/documentIntelligence'

const categoryOptions = [
  'Rental dispute',
  'Employment dispute',
  'Contract dispute',
  'Consumer complaint',
]

const jurisdictionOptions = ['Federal Court', 'State Court', 'District Court', 'Supreme Court']

const acceptedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'txt']
const maxFiles = 10
const maxDescriptionChars = 1500

export default function CaseInput() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { setActiveCaseId } = useActiveCase()

  const [caseId, setCaseId] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [runningDocumentIntelligence, setRunningDocumentIntelligence] = useState(false)
  const [docIntelligenceRan, setDocIntelligenceRan] = useState(false)
  const [resolvedDocumentPreview, setResolvedDocumentPreview] = useState<ReturnType<typeof buildDocumentPreview> | null>(null)
  const [validationMessage, setValidationMessage] = useState('')
  const [submissionMessage, setSubmissionMessage] = useState('')
  const [submissionError, setSubmissionError] = useState('')
  const fallbackDocumentPreview = useMemo(() => buildDocumentPreview(category, files), [category, files])
  const documentPreview = resolvedDocumentPreview || fallbackDocumentPreview

  const canRunDocumentIntelligence = useMemo(() => {
    return category !== '' && description.trim().length > 0 && jurisdiction !== ''
  }, [category, description, jurisdiction])

  const canSubmit = canRunDocumentIntelligence && docIntelligenceRan

  const buildCasePayload = () => ({
    category,
    description: description.trim(),
    jurisdiction,
    evidence: buildAnalyzePayloadDocuments(files),
  })

  const createFreshCaseWorkspace = async (reason?: 'stale-case') => {
    const response = await caseService.createCase(buildCasePayload())
    const nextCaseId = response?.case_id || ''
    if (nextCaseId) {
      setCaseId(nextCaseId)
      setActiveCaseId(nextCaseId)
      if (reason === 'stale-case') {
        setSubmissionMessage(
          'Your previous backend case session was no longer available, so JurisMind created a fresh workspace from your saved inputs.',
        )
      }
    }
    return nextCaseId
  }

  const ensureCaseWorkspace = async () => {
    if (!caseId) {
      return createFreshCaseWorkspace()
    }

    try {
      await caseService.getCaseState(caseId)
      setActiveCaseId(caseId)
      return caseId
    } catch (caughtError) {
      if (axios.isAxiosError(caughtError) && caughtError.response?.status === 404) {
        setCaseId('')
        return createFreshCaseWorkspace('stale-case')
      }
      throw caughtError
    }
  }

  const getValidFiles = (fileList: FileList | null) => {
    if (!fileList) return []
    return Array.from(fileList).filter((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
      return acceptedExtensions.includes(extension)
    })
  }

  const addFiles = (fileList: FileList | null) => {
    setValidationMessage('')
    setDocIntelligenceRan(false)
    setResolvedDocumentPreview(null)
    const valid = getValidFiles(fileList)
    if (!valid.length) return
    setFiles((current) => {
      if (current.length >= maxFiles) {
        setValidationMessage(`Maximum ${maxFiles} files allowed.`)
        return current
      }
      const existing = new Set(current.map((item) => `${item.name}-${item.size}`))
      const deduped = valid.filter((item) => !existing.has(`${item.name}-${item.size}`))
      const merged = [...current, ...deduped].slice(0, maxFiles)
      if (merged.length < current.length + deduped.length) {
        setValidationMessage(`Only first ${maxFiles} files were added.`)
      }
      return merged
    })
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    addFiles(event.dataTransfer.files)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setValidationMessage('')
    setSubmissionMessage('')
    setSubmissionError('')
    if (!canSubmit || submitting) return

    setSubmitting(true)

    try {
      const nextCaseId = (await ensureCaseWorkspace()) || caseId
      if (nextCaseId) {
        await caseService.runCaseAnalysis(nextCaseId, buildCasePayload())
      } else {
        await caseService.analyzeCase(buildCasePayload())
      }

      setSubmissionMessage('Case analyzed with backend reasoning. Opening analysis page...')
      setTimeout(() => {
        setSubmitting(false)
        navigate(nextCaseId ? `/analysis/${nextCaseId}` : '/analysis')
      }, 650)
      return
    } catch (caughtError) {
      setSubmissionError(
        getApiErrorMessage(
          caughtError,
          'Analysis did not complete. Your case input is still saved, but JurisMind will stay here until the backend finishes successfully.',
        ),
      )
      setSubmissionMessage('')
      setSubmitting(false)
      return
    }
  }

  const handleRunDocumentIntelligence = () => {
    void (async () => {
      setValidationMessage('')
      setSubmissionMessage('')
      setSubmissionError('')

      if (!canRunDocumentIntelligence) {
        setValidationMessage('Select case category, jurisdiction, and describe the case before running document intelligence.')
        return
      }

      setRunningDocumentIntelligence(true)

      try {
        const nextCaseId = (await ensureCaseWorkspace()) || caseId
        const response = nextCaseId
          ? await caseService.runCaseDocumentIntelligence(nextCaseId, buildCasePayload())
          : await caseService.getDocumentIntelligence(buildCasePayload())
        const nextPreview = buildStoredDocumentPreview(response || {})
        const responseCaseId = response?.caseMeta?.case_id || ''
        setResolvedDocumentPreview(nextPreview)
        setDocIntelligenceRan(true)
        if (responseCaseId) {
          setCaseId(responseCaseId)
          setActiveCaseId(responseCaseId)
        }
        setSubmissionMessage('Document intelligence refreshed from the backend. Review it, then continue to analysis.')
      } catch (caughtError) {
        const fallbackPreview = buildDocumentPreview(category, files)
        setResolvedDocumentPreview(fallbackPreview)
        setDocIntelligenceRan(true)
        setSubmissionError(getApiErrorMessage(caughtError, 'Backend document intelligence is unavailable. Showing the local preview instead.'))
      } finally {
        setRunningDocumentIntelligence(false)
      }
    })()
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="New Analysis"
        title="Case Input"
        description="Submit your dispute details for AI legal analysis. Documents are optional for the first pass."
      />

      <CaseWorkflowStepper />

      <section className="panel mt-6">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Label className="mb-2 block" htmlFor="case-category">
                Case Category
              </Label>
              <Select
                id="case-category"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value)
                  setDocIntelligenceRan(false)
                  setResolvedDocumentPreview(null)
                }}
                options={[
                  { label: 'Select case category', value: '' },
                  ...categoryOptions.map((option) => ({ label: option, value: option })),
                ]}
              />
            </div>

            <div>
              <Label className="mb-2 block" htmlFor="case-jurisdiction">
                Jurisdiction
              </Label>
              <Select
                id="case-jurisdiction"
                value={jurisdiction}
                onChange={(event) => {
                  setJurisdiction(event.target.value)
                  setDocIntelligenceRan(false)
                  setResolvedDocumentPreview(null)
                }}
                options={[
                  { label: 'Select jurisdiction', value: '' },
                  ...jurisdictionOptions.map((option) => ({ label: option, value: option })),
                ]}
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block" htmlFor="case-description">
              Case Description
            </Label>
            <Textarea
              id="case-description"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value)
                setDocIntelligenceRan(false)
                setResolvedDocumentPreview(null)
              }}
              placeholder="Describe relevant facts, timeline, parties involved, and legal concerns."
              maxLength={maxDescriptionChars}
              className="min-h-32"
            />
            <p className="mt-1 text-xs text-legal-muted">
              {description.length}/{maxDescriptionChars}
            </p>
          </div>

          <div>
            <Label className="mb-2 block">Evidence Upload</Label>
            <div
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                setDragging(false)
              }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-md border-2 border-dashed p-7 text-center transition-colors ${
                dragging
                  ? 'border-legal-blue bg-legal-blue/10'
                  : 'border-legal-gold/35 bg-legal-card hover:border-legal-gold'
              }`}
            >
              <Upload size={24} className="mx-auto mb-2 text-legal-gold" />
              <p className="text-sm text-legal-text">Drag and drop files or click to browse</p>
              <p className="mt-1 text-xs text-legal-muted">
                PDF, images, and document files. You can skip this for now and continue with case details only.
              </p>
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
                onChange={(event) => addFiles(event.target.files)}
              />
            </div>

            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-legal-muted">{files.length} file(s) selected</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFiles([])
                      setDocIntelligenceRan(false)
                      setResolvedDocumentPreview(null)
                    }}
                    className="text-xs text-legal-gold hover:underline"
                  >
                    Clear all
                  </button>
                </div>
                {files.map((file) => (
                  <div
                    key={`${file.name}-${file.size}`}
                    className="flex items-center justify-between rounded-md border border-slate-700 bg-legal-card px-3 py-2"
                  >
                    <p className="flex items-center gap-2 text-sm text-legal-text">
                      <FileText size={14} className="text-legal-gold" />
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        {
                          setFiles((current) =>
                            current.filter(
                              (entry) => `${entry.name}-${entry.size}` !== `${file.name}-${file.size}`,
                            ),
                          )
                          setDocIntelligenceRan(false)
                          setResolvedDocumentPreview(null)
                        }
                      }
                      className="text-legal-muted hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {validationMessage && (
              <p className="mt-2 text-xs text-amber-300">{validationMessage}</p>
            )}
          </div>

          <div className="rounded-xl border border-legal-gold/20 bg-legal-card p-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 text-legal-gold" />
              <div>
                <h2 className="text-lg font-semibold text-legal-text">Documentation Intelligence</h2>
                <p className="mt-1 text-sm text-legal-muted">
                  Before deeper legal analysis begins, JurisMind checks what documents are present,
                  what may be missing, and how case-ready the current package appears. If nothing is
                  uploaded yet, JurisMind will suggest what to collect next.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <ReadinessSummaryCard
                completenessScore={documentPreview.completenessScore}
                readinessStatus={documentPreview.readinessStatus}
                fileCount={files.length}
                availableCount={documentPreview.availableDocuments.length}
                missingCount={documentPreview.missingDocuments.length}
                reliabilityNotes={documentPreview.reliabilityNotes}
              />

              <DocumentChecklistPanel
                availableDocuments={documentPreview.availableDocuments}
                missingDocuments={documentPreview.missingDocuments}
                optionalDocuments={documentPreview.optionalDocuments}
              />

              <EvidenceInventoryTable inventory={documentPreview.inventory} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRunDocumentIntelligence}
              disabled={!canRunDocumentIntelligence || submitting || runningDocumentIntelligence}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-legal-text disabled:cursor-not-allowed disabled:opacity-50"
            >
              {runningDocumentIntelligence ? 'Refreshing...' : 'Run Document Intelligence'}
            </button>
            <button type="submit" disabled={!canSubmit || submitting || runningDocumentIntelligence} className="btn-legal">
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Preparing Analysis...
              </span>
            ) : (
              'Analyze Case'
            )}
            </button>
          </div>
          {!docIntelligenceRan && canRunDocumentIntelligence ? (
            <p className="text-xs text-legal-muted">
              Run document intelligence first so the checklist and readiness view are locked in before full analysis.
            </p>
          ) : null}
          {submissionMessage ? (
            <p className="text-sm text-emerald-400">{submissionMessage}</p>
          ) : null}
          {submissionError ? <ErrorMessage title="Analysis Request" message={submissionError} /> : null}
        </form>
      </section>
    </div>
  )
}
