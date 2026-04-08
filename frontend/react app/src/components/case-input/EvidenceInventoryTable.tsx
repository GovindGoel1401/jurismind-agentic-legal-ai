interface EvidenceInventoryItem {
  id: string
  name: string
  detectedType: string
  detectedCategory: string
  description: string
  confidence: number
  reliabilityLabel: string
  inventoryStatus: string
  usableForAnalysis: boolean
  sizeBytes: number
}

interface EvidenceInventoryTableProps {
  inventory: EvidenceInventoryItem[]
}

function formatSize(sizeBytes: number) {
  return `${(sizeBytes / 1024).toFixed(1)} KB`
}

function formatConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}%`
}

export default function EvidenceInventoryTable({ inventory }: EvidenceInventoryTableProps) {
  return (
    <section className="card-legal">
      <div>
        <h2 className="text-lg font-semibold text-legal-text">Evidence Inventory</h2>
        <p className="mt-1 text-sm text-legal-muted">
          Initial file-by-file mapping of uploaded material into likely evidence categories.
        </p>
      </div>

      {inventory.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-legal-muted">
                <th className="pb-3 pr-4 font-medium">Document</th>
                <th className="pb-3 pr-4 font-medium">Detected Type</th>
                <th className="pb-3 pr-4 font-medium">Category</th>
                <th className="pb-3 pr-4 font-medium">Confidence</th>
                <th className="pb-3 pr-4 font-medium">Usable</th>
                <th className="pb-3 font-medium">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-legal-text">
              {inventory.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-4">
                    <p>{item.name}</p>
                    <p className="mt-1 text-xs text-legal-muted">{item.description}</p>
                  </td>
                  <td className="py-3 pr-4">{item.detectedType}</td>
                  <td className="py-3 pr-4">{item.detectedCategory}</td>
                  <td className="py-3 pr-4">{formatConfidence(item.confidence)}</td>
                  <td className="py-3 pr-4">{item.usableForAnalysis ? 'Yes' : 'Limited'}</td>
                  <td className="py-3">{formatSize(item.sizeBytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-slate-700 bg-legal-panel px-4 py-5 text-sm text-legal-muted">
          Upload evidence files to build the initial evidence inventory.
        </div>
      )}
    </section>
  )
}
