import PageHeader from '../components/shared/PageHeader'

export default function About() {
  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="Platform Overview"
        title="About JurisMind AI"
        description="JurisMind AI is a legal intelligence platform designed to structure legal reasoning before formal consultation. The interface presents a transparent workflow from case input to verdict generation."
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="card-legal">
          <h2 className="text-lg font-semibold text-legal-text">What is JurisMind AI</h2>
          <p className="mt-2 text-sm leading-relaxed text-legal-muted">
            A platform for legal teams and individuals to evaluate disputes, identify relevant laws,
            and compare similar outcomes using AI-assisted analysis.
          </p>
        </article>

        <article className="card-legal">
          <h2 className="text-lg font-semibold text-legal-text">How AI Reasoning Works</h2>
          <p className="mt-2 text-sm leading-relaxed text-legal-muted">
            Specialized agents interpret facts, extract entities, review evidence, run defense and
            prosecution debate, and produce a structured verdict recommendation.
          </p>
        </article>

        <article className="card-legal">
          <h2 className="text-lg font-semibold text-legal-text">Technologies Used</h2>
          <ul className="mt-2 space-y-1 text-sm text-legal-muted">
            <li>LangChain</li>
            <li>LangGraph</li>
            <li>LLM models</li>
            <li>RAG retrieval</li>
            <li>Agent orchestration</li>
          </ul>
        </article>
      </section>
    </div>
  )
}
