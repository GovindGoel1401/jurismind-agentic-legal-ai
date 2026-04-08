import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, GitBranch, Network, RefreshCw, Sparkles } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ErrorMessage from '../components/ErrorMessage'
import EmptyState from '../components/shared/EmptyState'
import InfoCard from '../components/shared/InfoCard'
import PageHeader from '../components/shared/PageHeader'
import CaseWorkflowStepper from '../components/shared/CaseWorkflowStepper'
import { Label } from '../components/ui/Label'
import { Select } from '../components/ui/Select'
import { useActiveCase } from '../context/ActiveCaseContext'
import { useAnalysisWorkspace } from '../hooks/useAnalysisWorkspace'
import { useCaseStageRedirect } from '../hooks/useCaseStageRedirect'
import caseService, { GraphPatternQueryType } from '../services/caseService'
import { getApiErrorMessage } from '../services/api'

type GraphNodeKind = 'case' | 'issue' | 'claim' | 'evidence' | 'risk' | 'factor' | 'pattern' | 'strategy' | 'related'

interface GraphNode {
  id: string
  label: string
  kind: GraphNodeKind
}

interface GraphEdge {
  from: string
  to: string
  label?: string
}

interface GraphModel {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

interface PositionedNode extends GraphNode {
  x: number
  y: number
}

const queryOptions: Array<{ label: string; value: GraphPatternQueryType }> = [
  { label: 'Case surface', value: 'case_surface' },
  { label: 'Unsupported claims', value: 'unsupported_claims' },
  { label: 'Contradictions', value: 'contradictions' },
  { label: 'Human factors', value: 'human_factors' },
  { label: 'Missing evidence clusters', value: 'missing_evidence_clusters' },
  { label: 'Unresolved issues', value: 'unresolved_issues' },
  { label: 'Structural similar cases', value: 'structural_similar_cases' },
  { label: 'Strategy actions', value: 'strategy_actions' },
]

const nodeColors: Record<GraphNodeKind, string> = {
  case: '#f59e0b',
  issue: '#38bdf8',
  claim: '#34d399',
  evidence: '#22c55e',
  risk: '#f97316',
  factor: '#a78bfa',
  pattern: '#f472b6',
  strategy: '#facc15',
  related: '#94a3b8',
}

function pushUniqueNode(target: GraphNode[], node: GraphNode) {
  if (!target.find((item) => item.id === node.id)) {
    target.push(node)
  }
}

function buildGraphFromPatternResult(
  queryType: GraphPatternQueryType,
  caseId: string,
  result: unknown,
): GraphModel {
  const caseNodeId = `case:${caseId || 'active'}`
  const nodes: GraphNode[] = [
    {
      id: caseNodeId,
      label: caseId || 'Current Case',
      kind: 'case',
    },
  ]
  const edges: GraphEdge[] = []

  const connectToCase = (id: string, label?: string) => {
    edges.push({ from: caseNodeId, to: id, label })
  }

  if (queryType === 'case_surface' && result && typeof result === 'object') {
    const surface = result as {
      issues?: string[]
      claims?: string[]
      evidence?: string[]
      risks?: string[]
    }

    ;(surface.issues || []).slice(0, 10).forEach((item, index) => {
      const id = `issue:${index}:${item}`
      pushUniqueNode(nodes, { id, label: item, kind: 'issue' })
      connectToCase(id, 'raises')
    })

    ;(surface.claims || []).slice(0, 10).forEach((item, index) => {
      const id = `claim:${index}:${item}`
      pushUniqueNode(nodes, { id, label: item, kind: 'claim' })
      connectToCase(id, 'claims')
    })

    ;(surface.evidence || []).slice(0, 10).forEach((item, index) => {
      const id = `evidence:${index}:${item}`
      pushUniqueNode(nodes, { id, label: item, kind: 'evidence' })
      connectToCase(id, 'has evidence')
    })

    ;(surface.risks || []).slice(0, 10).forEach((item, index) => {
      const id = `risk:${index}:${item}`
      pushUniqueNode(nodes, { id, label: item, kind: 'risk' })
      connectToCase(id, 'risk')
    })
  }

  if (queryType === 'unsupported_claims' && Array.isArray(result)) {
    result.slice(0, 16).forEach((item, index) => {
      const row = item as { title?: string; summary?: string }
      const label = row.title || row.summary || `Unsupported claim ${index + 1}`
      const id = `unsupported-claim:${index}:${label}`
      pushUniqueNode(nodes, { id, label, kind: 'claim' })
      connectToCase(id, 'unsupported')
    })
  }

  if (queryType === 'contradictions' && Array.isArray(result)) {
    result.slice(0, 12).forEach((item, index) => {
      const row = item as {
        label?: string
        summary?: string
        fact_signals?: string[]
        event_signals?: string[]
      }
      const label = row.label || row.summary || `Contradiction ${index + 1}`
      const contradictionId = `contradiction:${index}:${label}`
      pushUniqueNode(nodes, { id: contradictionId, label, kind: 'issue' })
      connectToCase(contradictionId, 'conflict')

      ;(row.fact_signals || []).slice(0, 3).forEach((fact, signalIndex) => {
        const factId = `fact:${index}:${signalIndex}:${fact}`
        pushUniqueNode(nodes, { id: factId, label: fact, kind: 'related' })
        edges.push({ from: contradictionId, to: factId, label: 'fact' })
      })

      ;(row.event_signals || []).slice(0, 3).forEach((event, signalIndex) => {
        const eventId = `event:${index}:${signalIndex}:${event}`
        pushUniqueNode(nodes, { id: eventId, label: event, kind: 'related' })
        edges.push({ from: contradictionId, to: eventId, label: 'event' })
      })
    })
  }

  if (queryType === 'human_factors' && Array.isArray(result)) {
    result.slice(0, 12).forEach((item, index) => {
      const row = item as { factor_type?: string; summary?: string; linked_patterns?: string[] }
      const label = row.factor_type || row.summary || `Human factor ${index + 1}`
      const factorId = `factor:${index}:${label}`
      pushUniqueNode(nodes, { id: factorId, label, kind: 'factor' })
      connectToCase(factorId, 'influences')

      ;(row.linked_patterns || []).slice(0, 3).forEach((pattern, patternIndex) => {
        const patternId = `pattern:${index}:${patternIndex}:${pattern}`
        pushUniqueNode(nodes, { id: patternId, label: pattern, kind: 'pattern' })
        edges.push({ from: factorId, to: patternId, label: 'pattern' })
      })
    })
  }

  if (queryType === 'missing_evidence_clusters' && Array.isArray(result)) {
    result.slice(0, 12).forEach((item, index) => {
      const row = item as { issue_cluster?: string; missing_label?: string; frequency?: number }
      const issueLabel = row.issue_cluster || `Issue cluster ${index + 1}`
      const issueId = `cluster-issue:${index}:${issueLabel}`
      pushUniqueNode(nodes, { id: issueId, label: issueLabel, kind: 'issue' })
      connectToCase(issueId, `missing x${row.frequency || 1}`)

      const missingLabel = row.missing_label || 'Missing evidence'
      const missingId = `cluster-missing:${index}:${missingLabel}`
      pushUniqueNode(nodes, { id: missingId, label: missingLabel, kind: 'evidence' })
      edges.push({ from: issueId, to: missingId, label: 'needs' })
    })
  }

  if (queryType === 'unresolved_issues' && Array.isArray(result)) {
    result.slice(0, 16).forEach((item, index) => {
      const row = item as { title?: string; summary?: string; missing_count?: number }
      const label = row.title || row.summary || `Unresolved issue ${index + 1}`
      const id = `unresolved:${index}:${label}`
      pushUniqueNode(nodes, { id, label, kind: 'issue' })
      connectToCase(id, `open gap x${row.missing_count || 0}`)
    })
  }

  if (queryType === 'structural_similar_cases' && Array.isArray(result)) {
    result.slice(0, 10).forEach((item, index) => {
      const row = item as { case_id?: string; structural_score?: number }
      const label = row.case_id || `Related case ${index + 1}`
      const id = `similar-case:${label}`
      pushUniqueNode(nodes, { id, label, kind: 'related' })
      connectToCase(id, `score ${row.structural_score || 0}`)
    })
  }

  if (queryType === 'strategy_actions' && Array.isArray(result)) {
    result.slice(0, 12).forEach((item, index) => {
      const row = item as {
        action?: string
        addressed_risks?: string[]
        addressed_missing_evidence?: string[]
      }
      const label = row.action || `Strategy action ${index + 1}`
      const strategyId = `strategy:${index}:${label}`
      pushUniqueNode(nodes, { id: strategyId, label, kind: 'strategy' })
      connectToCase(strategyId, 'mitigates')

      ;(row.addressed_risks || []).slice(0, 3).forEach((risk, riskIndex) => {
        const riskId = `strategy-risk:${index}:${riskIndex}:${risk}`
        pushUniqueNode(nodes, { id: riskId, label: risk, kind: 'risk' })
        edges.push({ from: strategyId, to: riskId, label: 'risk' })
      })

      ;(row.addressed_missing_evidence || []).slice(0, 3).forEach((missing, missingIndex) => {
        const missingId = `strategy-missing:${index}:${missingIndex}:${missing}`
        pushUniqueNode(nodes, { id: missingId, label: missing, kind: 'evidence' })
        edges.push({ from: strategyId, to: missingId, label: 'evidence' })
      })
    })
  }

  return { nodes, edges }
}

function positionNodes(nodes: GraphNode[]): PositionedNode[] {
  if (!nodes.length) return []

  const [center, ...rest] = nodes
  const positioned: PositionedNode[] = [{ ...center, x: 500, y: 310 }]

  const total = rest.length
  rest.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(total, 1)
    const ring = index % 2 === 0 ? 220 : 280
    const x = 500 + Math.cos(angle) * ring
    const y = 310 + Math.sin(angle) * (ring * 0.62)
    positioned.push({ ...node, x, y })
  })

  return positioned
}

function truncateLabel(label: string) {
  if (label.length <= 30) return label
  return `${label.slice(0, 28)}...`
}

export default function KnowledgeGraph() {
  const navigate = useNavigate()
  const { caseId: routeCaseId } = useParams()
  const { setActiveCaseId } = useActiveCase()
  const caseId = useCaseStageRedirect('/knowledge-graph', routeCaseId)
  const {
    caseContext,
    latestAnalysis,
    hasStoredCase,
    hasStoredAnalysis,
    loading: workspaceLoading,
  } = useAnalysisWorkspace(caseId)

  const [queryType, setQueryType] = useState<GraphPatternQueryType>('case_surface')
  const [limit, setLimit] = useState(10)
  const [minCount, setMinCount] = useState(2)
  const [riskType, setRiskType] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<unknown>(null)
  const [entrySearch, setEntrySearch] = useState('')
  const [entryKind, setEntryKind] = useState<GraphNodeKind | 'all'>('all')
  const [seedingDemo, setSeedingDemo] = useState(false)
  const [seedMessage, setSeedMessage] = useState('')

  const graphModel = useMemo(() => buildGraphFromPatternResult(queryType, caseId, result), [caseId, queryType, result])
  const nodes = useMemo(() => positionNodes(graphModel.nodes), [graphModel.nodes])
  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node])), [nodes])
  const filteredEntries = useMemo(() => {
    const lower = entrySearch.trim().toLowerCase()
    return graphModel.nodes.filter((node) => {
      if (entryKind !== 'all' && node.kind !== entryKind) return false
      if (!lower) return true
      return node.label.toLowerCase().includes(lower)
    })
  }, [entryKind, entrySearch, graphModel.nodes])
  const edgeRows = useMemo(
    () =>
      graphModel.edges
        .map((edge) => {
          const from = graphModel.nodes.find((item) => item.id === edge.from)
          const to = graphModel.nodes.find((item) => item.id === edge.to)
          return {
            key: `${edge.from}-${edge.to}-${edge.label || ''}`,
            fromLabel: from?.label || edge.from,
            toLabel: to?.label || edge.to,
            label: edge.label || 'related',
          }
        })
        .slice(0, 24),
    [graphModel.edges, graphModel.nodes],
  )

  const runGraphQuery = async () => {
    if (!caseId) {
      setError('Select an active case first to query graph patterns.')
      setResult(null)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await caseService.queryCaseKnowledgeGraphPattern(caseId, {
        query_type: queryType,
        limit,
        min_count: minCount,
        risk_type: riskType,
      })
      setResult(response.result || null)
    } catch (caughtError) {
      setResult(null)
      setError(getApiErrorMessage(caughtError, 'Knowledge graph query is unavailable right now.'))
    } finally {
      setLoading(false)
    }
  }

  const handleSeedDemoCase = async () => {
    if (seedingDemo) return

    setSeedingDemo(true)
    setError('')
    setSeedMessage('Creating demo case and running full pipeline...')

    const payload = {
      category: 'Contract dispute',
      jurisdiction: 'Delhi',
      description:
        'I paid an advance under a service agreement, the contractor stopped work, and refund is being denied. I currently have invoice copies and message history but some banking proof is pending.',
      evidence: [
        { name: 'agreement.pdf', size: 120000, type: 'application/pdf' },
        { name: 'invoice.jpg', size: 45000, type: 'image/jpeg' },
        { name: 'message_history.txt', size: 9000, type: 'text/plain' },
      ],
    }

    try {
      const created = await caseService.createCase(payload)
      const nextCaseId = created?.case_id || ''
      if (!nextCaseId) {
        throw new Error('Unable to create demo case workspace.')
      }

      await caseService.runCaseDocumentIntelligence(nextCaseId, payload)
      await caseService.runCaseAnalysis(nextCaseId, payload)
      setActiveCaseId(nextCaseId)
      setSeedMessage('Demo case created successfully. Opening graph workspace...')
      navigate(`/knowledge-graph/${nextCaseId}`)
    } catch (caughtError) {
      setSeedMessage('')
      setError(getApiErrorMessage(caughtError, 'Unable to seed demo case at the moment.'))
    } finally {
      setSeedingDemo(false)
    }
  }

  useEffect(() => {
    if (!caseId || workspaceLoading || !hasStoredAnalysis) return
    void runGraphQuery()
  }, [caseId, workspaceLoading, hasStoredAnalysis, queryType])

  if (workspaceLoading) {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="Graph" title="Knowledge Graph" description="Loading case workspace..." />
      </div>
    )
  }

  if (!hasStoredCase) {
    return (
      <div className="page-shell space-y-6">
        <PageHeader
          eyebrow="Graph"
          title="Knowledge Graph"
          description="Relationship view of issues, evidence, risks, and strategy nodes."
        />
        <CaseWorkflowStepper />
        <section className="panel">
          <EmptyState
            title="No active case selected"
            description="Create or select a case first so JurisMind can render a case-specific graph surface."
            actionLabel="Start Case Analysis"
            actionHref="/case-input"
          />
        </section>
      </div>
    )
  }

  if (!hasStoredAnalysis) {
    return (
      <div className="page-shell space-y-6">
        <PageHeader
          eyebrow="Graph"
          title="Knowledge Graph"
          description="Relationship view of issues, evidence, risks, and strategy nodes."
        />
        <CaseWorkflowStepper />
        <section className="panel">
          <EmptyState
            title="Analysis not completed for this case yet"
            description="Graph patterns rely on case analysis outputs. Run the analysis pipeline for this case first."
            actionLabel="Open Analysis"
            actionHref={caseId ? `/analysis/${caseId}` : '/analysis'}
          />
        </section>
      </div>
    )
  }

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        eyebrow="Graph"
        title="Knowledge Graph"
        description={`Explore structured links for ${caseId}. Inspect unresolved issues, contradictions, strategy actions, and cross-case patterns.`}
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-legal-muted">
            Need graph entries quickly? Seed a demo case and auto-run document intelligence plus analysis.
          </p>
          <button
            type="button"
            onClick={() => void handleSeedDemoCase()}
            disabled={seedingDemo}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-legal-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            {seedingDemo ? 'Seeding Demo...' : 'Seed Demo Case'}
          </button>
        </div>
        {seedMessage ? <p className="mt-2 text-xs text-emerald-300">{seedMessage}</p> : null}
      </section>

      <CaseWorkflowStepper />

      <section className="grid gap-3 md:grid-cols-4">
        <InfoCard label="Case Category" value={caseContext.category} />
        <InfoCard label="Jurisdiction" value={caseContext.jurisdiction} />
        <InfoCard label="Graph Nodes" value={String(nodes.length)} />
        <InfoCard label="Graph Edges" value={String(graphModel.edges.length)} />
      </section>

      <section className="panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-legal-text">Graph Entries</h3>
            <p className="mt-1 text-sm text-legal-muted">
              Explicit node entries and relationship rows produced from the current graph query.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-xl">
            <input
              value={entrySearch}
              onChange={(event) => setEntrySearch(event.target.value)}
              placeholder="Search node labels"
              className="h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm text-legal-text outline-none placeholder:text-legal-muted"
            />
            <Select
              value={entryKind}
              onChange={(event) => setEntryKind(event.target.value as GraphNodeKind | 'all')}
              options={[
                { label: 'All node types', value: 'all' },
                ...((Object.keys(nodeColors) as GraphNodeKind[]).map((kind) => ({
                  label: kind[0].toUpperCase() + kind.slice(1),
                  value: kind,
                }))),
              ]}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-legal-muted">Nodes ({filteredEntries.length})</p>
            <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
              {filteredEntries.length ? (
                filteredEntries.map((node) => (
                  <div key={node.id} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-legal-text">{node.label}</p>
                      <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide" style={{ backgroundColor: `${nodeColors[node.kind]}33`, color: nodeColors[node.kind] }}>
                        {node.kind}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-legal-muted">{node.id}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-white/15 px-3 py-4 text-sm text-legal-muted">
                  No entries matched this filter.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-legal-muted">Relationships ({graphModel.edges.length})</p>
            <div className="mt-3 max-h-64 space-y-2 overflow-auto pr-1">
              {edgeRows.length ? (
                edgeRows.map((row) => (
                  <div key={row.key} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <p className="text-sm text-legal-text">{truncateLabel(row.fromLabel)} → {truncateLabel(row.toLabel)}</p>
                    <p className="mt-1 text-xs text-legal-muted">relation: {row.label}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-white/15 px-3 py-4 text-sm text-legal-muted">
                  No relationship rows available for this query.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[28px] border border-emerald-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.2),_transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6">
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-100">
              <Network size={13} />
              Graph Pattern Query
            </div>
            <h2 className="mt-4 text-3xl font-semibold text-white">Map legal reasoning pressure points.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              This view queries backend Neo4j pattern endpoints and projects the response as a case-aware network.
              Switch query modes to compare issue surfaces, contradiction hotspots, and strategy response paths.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void runGraphQuery()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Graph
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label className="mb-2 block" htmlFor="graph-query-type">
              Query Type
            </Label>
            <Select
              id="graph-query-type"
              value={queryType}
              onChange={(event) => setQueryType(event.target.value as GraphPatternQueryType)}
              options={queryOptions.map((option) => ({ label: option.label, value: option.value }))}
            />
          </div>

          <label className="text-sm text-legal-muted">
            Limit: {limit}
            <input
              type="range"
              min={3}
              max={25}
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className="mt-3 w-full accent-emerald-400"
            />
          </label>

          <label className="text-sm text-legal-muted">
            Min Cluster Count: {minCount}
            <input
              type="range"
              min={1}
              max={20}
              value={minCount}
              onChange={(event) => setMinCount(Number(event.target.value))}
              className="mt-3 w-full accent-amber-400"
            />
          </label>

          <div>
            <Label className="mb-2 block" htmlFor="risk-type-input">
              Risk Type Filter (optional)
            </Label>
            <input
              id="risk-type-input"
              value={riskType}
              onChange={(event) => setRiskType(event.target.value)}
              placeholder="example: evidence_gap"
              className="h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm text-legal-text outline-none placeholder:text-legal-muted"
            />
          </div>
        </div>
      </section>

      {error ? <ErrorMessage title="Knowledge Graph" message={error} onRetry={() => void runGraphQuery()} /> : null}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel overflow-hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-legal-text">Relationship Canvas</h3>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-legal-muted">{queryType}</span>
          </div>

          {nodes.length <= 1 ? (
            <div className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-legal-muted">
              Graph response did not return enough linked entities for this query mode.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#020617]/60">
              <svg viewBox="0 0 1000 620" className="h-[460px] w-full min-w-[760px]">
                {graphModel.edges.map((edge) => {
                  const from = nodeMap[edge.from]
                  const to = nodeMap[edge.to]
                  if (!from || !to) return null
                  return (
                    <g key={`${edge.from}-${edge.to}-${edge.label || ''}`}>
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke="rgba(148,163,184,0.45)"
                        strokeWidth={1.2}
                      />
                      {edge.label ? (
                        <text
                          x={(from.x + to.x) / 2}
                          y={(from.y + to.y) / 2}
                          fill="rgba(226,232,240,0.75)"
                          fontSize="10"
                          textAnchor="middle"
                        >
                          {edge.label}
                        </text>
                      ) : null}
                    </g>
                  )
                })}

                {nodes.map((node) => (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.kind === 'case' ? 22 : 12}
                      fill={nodeColors[node.kind] || '#94a3b8'}
                      opacity={node.kind === 'case' ? 0.92 : 0.86}
                    />
                    <text
                      x={node.x}
                      y={node.y + (node.kind === 'case' ? 38 : 26)}
                      fill="rgba(241,245,249,0.9)"
                      fontSize={node.kind === 'case' ? '12' : '11'}
                      textAnchor="middle"
                    >
                      {truncateLabel(node.label)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <section className="panel">
            <div className="flex items-center gap-2">
              <GitBranch size={16} className="text-amber-300" />
              <h3 className="text-lg font-semibold text-legal-text">Legend</h3>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              {(Object.keys(nodeColors) as GraphNodeKind[]).map((kind) => (
                <div key={kind} className="flex items-center gap-2 text-legal-muted">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: nodeColors[kind] }} />
                  <span className="capitalize">{kind}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-sky-300" />
              <h3 className="text-lg font-semibold text-legal-text">Backend Payload Snapshot</h3>
            </div>
            <pre className="mt-4 max-h-72 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-slate-200">
{JSON.stringify(result || { message: 'No graph payload loaded yet.' }, null, 2)}
            </pre>
          </section>

          {latestAnalysis?.caseMeta?.case_id ? (
            <section className="panel">
              <div className="flex flex-wrap gap-3">
                <Link to={`/analysis/${latestAnalysis.caseMeta.case_id}`} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-legal-text">
                  Back To Analysis
                </Link>
                <Link to={`/verdict/${latestAnalysis.caseMeta.case_id}`} className="btn-legal">
                  Continue To Verdict
                </Link>
              </div>
            </section>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 text-amber-200" />
          <p className="text-sm leading-6 text-amber-100">
            Graph insights are structural aides for legal reasoning. They should be interpreted together with case facts,
            legal authority, and professional legal advice.
          </p>
        </div>
      </section>
    </div>
  )
}
