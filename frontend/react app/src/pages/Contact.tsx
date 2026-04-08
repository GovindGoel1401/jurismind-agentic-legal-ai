import { FormEvent, useState } from 'react'
import { Mail, MapPin, Phone } from 'lucide-react'
import PageHeader from '../components/shared/PageHeader'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'

const contactTopicOptions = [
  { label: 'General inquiry', value: 'general' },
  { label: 'Partnership', value: 'partnership' },
  { label: 'Technical support', value: 'support' },
  { label: 'Enterprise sales', value: 'enterprise' },
]

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    setMessage('')
  }

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="Support"
        title="Contact"
        description="Reach out for product support, legal-tech partnerships, and enterprise integration."
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="card-legal space-y-3">
          <h2 className="text-lg font-semibold text-legal-text">Contact Information</h2>
          <p className="flex items-center gap-2 text-sm text-legal-muted">
            <Mail size={14} className="text-legal-gold" />
            support@jurismind.ai
          </p>
          <p className="flex items-center gap-2 text-sm text-legal-muted">
            <Phone size={14} className="text-legal-gold" />
            +1 (800) 529-7424
          </p>
          <p className="flex items-center gap-2 text-sm text-legal-muted">
            <MapPin size={14} className="text-legal-gold" />
            220 Market Street, San Francisco, CA
          </p>
        </article>

        <form onSubmit={handleSubmit} className="card-legal space-y-3">
          <h2 className="text-lg font-semibold text-legal-text">Send a Message</h2>
          <Label htmlFor="contact-name">Full name</Label>
          <Input
            id="contact-name"
            type="text"
            required
            placeholder="Full name"
          />
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            required
            placeholder="Email"
          />
          <Label htmlFor="contact-topic">Topic</Label>
          <Select id="contact-topic" options={contactTopicOptions} />
          <Label htmlFor="contact-message">Message</Label>
          <Textarea
            id="contact-message"
            required
            placeholder="How can we help?"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={1000}
            className="min-h-28"
          />
          <p className="text-xs text-legal-muted">{message.length}/1000</p>
          <button type="submit" className="btn-legal">
            Send Message
          </button>
          {submitted && (
            <p className="text-sm text-emerald-400">Message received. We will follow up.</p>
          )}
        </form>
      </section>
    </div>
  )
}
