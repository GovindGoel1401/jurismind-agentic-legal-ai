import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { VerdictLayer } from '../../types/analysis'

interface VerdictLayerAccordionProps {
  layers: VerdictLayer[]
}

export default function VerdictLayerAccordion({ layers }: VerdictLayerAccordionProps) {
  const [activeLayer, setActiveLayer] = useState(layers[0]?.layer_name || '')

  return (
    <div className="space-y-3">
      {layers.map((layer) => {
        const isOpen = activeLayer === layer.layer_name

        return (
          <article key={layer.layer_name} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <button
              type="button"
              onClick={() => setActiveLayer(isOpen ? '' : layer.layer_name)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-300/80">Verdict Layer</p>
                <h3 className="mt-1 text-lg font-semibold text-legal-text">{layer.layer_name}</h3>
                <p className="mt-2 text-sm text-legal-muted">{layer.summary}</p>
              </div>
              <ChevronDown
                size={18}
                className={`shrink-0 text-amber-300 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isOpen ? (
              <div className="border-t border-white/10 px-5 py-4">
                <div className="grid gap-5 lg:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-legal-muted">Positive / Negative Signals</p>
                    <div className="mt-3 space-y-2">
                      {(layer.positive_signals || []).length || (layer.negative_signals || []).length ? (
                        <>
                          {(layer.positive_signals || []).map((point) => (
                            <p
                              key={`pos-${point.title}`}
                              className="rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-3 py-2 text-sm text-legal-text"
                            >
                              {point.title}: {point.detail}
                            </p>
                          ))}
                          {(layer.negative_signals || []).map((point) => (
                            <p
                              key={`neg-${point.title}`}
                              className="rounded-xl border border-rose-400/15 bg-rose-400/10 px-3 py-2 text-sm text-legal-text"
                            >
                              {point.title}: {point.detail}
                            </p>
                          ))}
                        </>
                      ) : (
                        <div className="space-y-2">
                          {layer.reasoning_points.map((point) => (
                            <p
                              key={point}
                              className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-legal-text"
                            >
                              {point}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-legal-muted">Source Basis / Unresolved Points</p>
                    <div className="mt-3 space-y-2">
                      {layer.source_basis ? (
                        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-legal-text">
                          Source: {layer.source_basis}
                        </p>
                      ) : null}
                      {layer.unresolved_points?.length ? (
                        layer.unresolved_points.map((point) => (
                          <p
                            key={point}
                            className="rounded-xl border border-amber-400/15 bg-amber-400/10 px-3 py-2 text-sm text-amber-100"
                          >
                            {point}
                          </p>
                        ))
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {layer.contributing_factors.map((factor) => (
                            <span
                              key={factor}
                              className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-100"
                            >
                              {factor}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {layer.effect_on_outcome ? (
                  <div className="mt-4 rounded-xl border border-sky-400/15 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
                    Effect on outcome: {layer.effect_on_outcome}
                  </div>
                ) : null}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
