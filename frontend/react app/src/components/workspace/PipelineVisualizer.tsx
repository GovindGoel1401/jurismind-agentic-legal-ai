import AgentCard from './AgentCard'
import { AgentItem } from './types'

interface PipelineVisualizerProps {
  agents: AgentItem[]
}

export default function PipelineVisualizer({ agents }: PipelineVisualizerProps) {
  return (
    <section className="rounded-xl border border-slate-700 bg-ai-panel p-6">
      <h2 className="text-xl font-semibold text-ai-text mb-4">AI Pipeline Visualization</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {agents.map((agent, index) => (
          <AgentCard key={agent.key} name={agent.name} status={agent.status} index={index} />
        ))}
      </div>

      <div className="rounded-lg border border-slate-700 bg-ai-bg/70 p-4 text-sm text-ai-text">
        <p className="text-slate-300 mb-2">Reasoning Flow</p>
        <div className="space-y-1 text-slate-200">
          <p>Case Interpreter</p>
          <p>↓</p>
          <p>Evidence Analyzer</p>
          <p>↓</p>
          <p>Legal Research</p>
          <p>↙ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ↘</p>
          <p>Defense &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Prosecution</p>
          <p>↓</p>
          <p>Judge</p>
          <p>↓</p>
          <p className="text-violet-300 font-medium">Verdict</p>
        </div>
      </div>
    </section>
  )
}
