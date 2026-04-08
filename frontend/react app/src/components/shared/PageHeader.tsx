interface PageHeaderProps {
  title: string
  description: string
  eyebrow?: string
}

export default function PageHeader({ title, description, eyebrow }: PageHeaderProps) {
  return (
    <section className="panel">
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-legal-gold">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="section-title">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-legal-muted">{description}</p>
    </section>
  )
}
