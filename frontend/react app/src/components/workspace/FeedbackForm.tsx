import { FormEvent, useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { Label } from '../ui/Label'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { FeedbackPayload } from './types'

interface FeedbackFormProps {
  onSubmitFeedback: (payload: FeedbackPayload) => void
}

const accuracyOptions = [
  { label: 'Select option', value: '' },
  { label: 'Accurate', value: 'accurate' },
  { label: 'Partially accurate', value: 'partially-accurate' },
  { label: 'Incorrect', value: 'incorrect' },
]

export default function FeedbackForm({ onSubmitFeedback }: FeedbackFormProps) {
  const [rating, setRating] = useState(0)
  const [accuracy, setAccuracy] = useState<FeedbackPayload['accuracy'] | ''>('')
  const [missedSection, setMissedSection] = useState('')
  const [additionalComments, setAdditionalComments] = useState('')

  const isValid = useMemo(() => rating > 0 && accuracy !== '', [rating, accuracy])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!isValid) return
    if (accuracy === '') return

    onSubmitFeedback({
      rating,
      accuracy,
      missedSection: missedSection.trim(),
      additionalComments: additionalComments.trim(),
    })

    setRating(0)
    setAccuracy('')
    setMissedSection('')
    setAdditionalComments('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="mb-2 block">Rating (1–5 stars)</Label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" onClick={() => setRating(value)} className="p-1">
              <Star
                size={20}
                className={value <= rating ? 'fill-blue-400 text-blue-400' : 'text-slate-500'}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="accuracy" className="mb-2 block">
          Was this verdict accurate?
        </Label>
        <Select
          id="accuracy"
          options={accuracyOptions}
          value={accuracy}
          onChange={(event) => setAccuracy(event.target.value as FeedbackPayload['accuracy'])}
          required
        />
      </div>

      <div>
        <Label htmlFor="missed-section" className="mb-2 block">
          Did the AI miss any legal section?
        </Label>
        <Textarea
          id="missed-section"
          value={missedSection}
          onChange={(event) => setMissedSection(event.target.value)}
          placeholder="Mention any missed statute, section, or precedent"
        />
      </div>

      <div>
        <Label htmlFor="comments" className="mb-2 block">
          Additional comments
        </Label>
        <Textarea
          id="comments"
          value={additionalComments}
          onChange={(event) => setAdditionalComments(event.target.value)}
          placeholder="Any extra guidance for improving reasoning"
        />
      </div>

      <button type="submit" disabled={!isValid} className="btn-legal w-full">
        Submit Feedback
      </button>
    </form>
  )
}
