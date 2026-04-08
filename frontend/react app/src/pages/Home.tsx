import { motion } from 'framer-motion'
import { BookOpen, Building2, Gavel, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'

const features = [
  {
    title: 'AI Legal Analysis',
    description: 'Structured legal issue detection with explainable reasoning outputs.',
    icon: Scale,
  },
  {
    title: 'Case Simulation',
    description: 'Simulate defense and prosecution paths before formal legal action.',
    icon: Gavel,
  },
  {
    title: 'Similar Case Retrieval',
    description: 'Find related precedents through retrieval-augmented search.',
    icon: BookOpen,
  },
  {
    title: 'Agent-based Legal Reasoning',
    description: 'Specialized AI agents collaborate to generate a consistent verdict flow.',
    icon: Building2,
  },
]

const metrics = [
  { label: 'Reasoning Stages', value: '8' },
  { label: 'Agent Collaboration', value: 'Multi-Agent' },
  { label: 'Output Format', value: 'Structured Verdict' },
]

export default function Home() {
  return (
    <div className="page-shell space-y-10">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel overflow-hidden"
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-legal-gold">
              JurisMind AI Platform
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-legal-text sm:text-5xl">
              AI Legal Verdict Simulator
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-legal-muted">
              Analyze legal disputes and simulate courtroom reasoning using AI.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/case-input" className="btn-legal">
                Start Case Analysis
              </Link>
              <a href="#features" className="btn-legal-outline">
                Explore Features
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-legal-gold/25 bg-legal-card p-6">
            <p className="text-sm text-legal-muted">Workflow Overview</p>
            <div className="mt-4 space-y-3 text-sm text-legal-text">
              <p>1. Case input and document upload</p>
              <p>2. Agent-based legal analysis</p>
              <p>3. Debate simulation</p>
              <p>4. Verdict and similar case retrieval</p>
            </div>
          </div>
        </div>
      </motion.section>

      <section id="features" className="space-y-5">
        <h2 className="section-title">Platform Capabilities</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                viewport={{ once: true }}
                className="card-legal"
              >
                <Icon size={20} className="mb-3 text-legal-gold" />
                <h3 className="text-base font-semibold text-legal-text">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-legal-muted">
                  {feature.description}
                </p>
              </motion.article>
            )
          })}
        </div>
      </section>

      <section className="panel">
        <h2 className="text-xl font-semibold text-legal-text">Why Legal Teams Use JurisMind</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-slate-700 bg-legal-card px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-legal-muted">{metric.label}</p>
              <p className="mt-1 text-lg font-semibold text-legal-gold">{metric.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
