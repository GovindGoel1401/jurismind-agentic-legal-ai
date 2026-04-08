import { DragEvent, FormEvent, useMemo, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Label } from '../ui/Label'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { CaseInputData } from './types'

interface CaseInputPanelProps {
  onAnalyzeCase: (payload: CaseInputData) => void
}

const categoryOptions = [
  { label: 'Select case category', value: '' },
  { label: 'Rental dispute', value: 'rental-dispute' },
  { label: 'Employment dispute', value: 'employment-dispute' },
  { label: 'Contract dispute', value: 'contract-dispute' },
  { label: 'Consumer complaint', value: 'consumer-complaint' },
]

const jurisdictionOptions = [
  { label: 'Select jurisdiction', value: '' },
  { label: 'Delhi, India', value: 'delhi-india' },
  { label: 'Maharashtra, India', value: 'maharashtra-india' },
  { label: 'Karnataka, India', value: 'karnataka-india' },
  { label: 'Tamil Nadu, India', value: 'tamil-nadu-india' },
]

const acceptedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'txt']

export default function CaseInputPanel({ onAnalyzeCase }: CaseInputPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [jurisdiction, setJurisdiction] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const canSubmit = useMemo(
    () => category !== '' && description.trim().length > 0 && jurisdiction !== '' && files.length > 0,
    [category, description, jurisdiction, files.length],
  )

  const validFiles = (fileList: FileList | null) => {
    if (!fileList) return []
    return Array.from(fileList).filter((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      return acceptedExtensions.includes(ext)
    })
  }

  const addFiles = (fileList: FileList | null) => {
    const nextFiles = validFiles(fileList)
    if (!nextFiles.length) return

    setFiles((current) => {
      const existing = new Set(current.map((item) => `${item.name}-${item.size}`))
      const merged = nextFiles.filter((item) => !existing.has(`${item.name}-${item.size}`))
      return [...current, ...merged]
    })
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    addFiles(event.dataTransfer.files)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return

    onAnalyzeCase({ category, description: description.trim(), jurisdiction, files })
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-ai-panel p-6">
      <h2 className="text-xl font-semibold text-ai-text mb-4">Case Input Panel</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="case-category" className="mb-2 block">
            Case category
          </Label>
          <Select
            id="case-category"
            options={categoryOptions}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="case-description" className="mb-2 block">
            Case description
          </Label>
          <Textarea
            id="case-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the legal problem, key facts, and timeline"
            className="min-h-[130px]"
            required
          />
        </div>

        <div>
          <Label htmlFor="jurisdiction" className="mb-2 block">
            Jurisdiction
          </Label>
          <Select
            id="jurisdiction"
            options={jurisdictionOptions}
            value={jurisdiction}
            onChange={(event) => setJurisdiction(event.target.value)}
            required
          />
        </div>

        <div>
          <Label className="mb-2 block">Evidence upload (drag and drop)</Label>
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              setIsDragging(false)
            }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-blue-400 bg-blue-500/10'
                : 'border-slate-600 bg-ai-bg/60 hover:border-blue-400'
            }`}
          >
            <Upload size={28} className="text-blue-400 mx-auto mb-2" />
            <p className="text-sm text-ai-text">Drag & drop files or click to upload</p>
            <p className="text-xs text-slate-400 mt-1">PDF, images, and documents supported</p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt"
              onChange={(event) => addFiles(event.target.files)}
            />
          </div>

          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file) => (
                <div
                  key={`${file.name}-${file.size}`}
                  className="flex items-center justify-between rounded-md border border-slate-700 bg-ai-bg/70 px-3 py-2"
                >
                  <p className="text-sm text-slate-300">{file.name}</p>
                  <button
                    type="button"
                    onClick={() =>
                      setFiles((current) =>
                        current.filter(
                          (entry) => `${entry.name}-${entry.size}` !== `${file.name}-${file.size}`,
                        ),
                      )
                    }
                  >
                    <X size={16} className="text-slate-400 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={!canSubmit} className="btn-legal w-full md:w-auto">
          Analyze Case
        </button>
      </form>
    </section>
  )
}
