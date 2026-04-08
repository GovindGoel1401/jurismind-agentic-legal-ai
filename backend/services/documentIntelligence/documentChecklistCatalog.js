const defaultChecklist = {
  required: [
    {
      type: 'identity-proof',
      label: 'Identity proof',
      description: 'Government identity or client identification document.',
    },
    {
      type: 'primary-fact-record',
      label: 'Primary fact record',
      description: 'Core document that establishes the dispute facts or event timeline.',
    },
  ],
  optional: [
    {
      type: 'witness-statement',
      label: 'Witness statement',
      description: 'Statements or supporting narratives from third parties.',
    },
    {
      type: 'timeline-summary',
      label: 'Timeline summary',
      description: 'Chronology of events, notices, and communications.',
    },
  ],
}

const checklistByCategory = {
  'rental dispute': {
    required: [
      {
        type: 'lease-agreement',
        label: 'Lease or rental agreement',
        description: 'Signed lease, rent terms, or tenancy agreement.',
      },
      {
        type: 'payment-proof',
        label: 'Rent payment proof',
        description: 'Receipts, bank transfers, or payment screenshots.',
      },
      {
        type: 'notice-letter',
        label: 'Notice or legal communication',
        description: 'Eviction notice, demand notice, or written complaint.',
      },
    ],
    optional: [
      {
        type: 'property-photos',
        label: 'Property photos',
        description: 'Visual proof of damage, condition, or occupancy issues.',
      },
      {
        type: 'inspection-report',
        label: 'Inspection or maintenance report',
        description: 'Third-party record of property condition or repairs.',
      },
    ],
  },
  'employment dispute': {
    required: [
      {
        type: 'employment-contract',
        label: 'Employment contract or offer letter',
        description: 'Terms of employment, role, salary, or appointment proof.',
      },
      {
        type: 'salary-record',
        label: 'Salary or payslip record',
        description: 'Payslips, payroll entries, or compensation proof.',
      },
      {
        type: 'termination-letter',
        label: 'Termination, warning, or HR notice',
        description: 'Official employment action or dispute-triggering notice.',
      },
    ],
    optional: [
      {
        type: 'email-thread',
        label: 'Email or chat communications',
        description: 'Workplace communication relevant to the dispute.',
      },
      {
        type: 'performance-review',
        label: 'Performance review or appraisal',
        description: 'Documents supporting performance context or contradiction.',
      },
    ],
  },
  'contract dispute': {
    required: [
      {
        type: 'contract-copy',
        label: 'Signed contract or agreement',
        description: 'Primary contract, amendment, or signed undertaking.',
      },
      {
        type: 'invoice-record',
        label: 'Invoice or billing record',
        description: 'Invoice, billing statement, or payment demand.',
      },
      {
        type: 'breach-notice',
        label: 'Breach notice or dispute communication',
        description: 'Notice alleging breach, non-performance, or refusal.',
      },
    ],
    optional: [
      {
        type: 'delivery-proof',
        label: 'Delivery or execution proof',
        description: 'Proof that goods, services, or milestones were delivered.',
      },
      {
        type: 'payment-proof',
        label: 'Payment proof',
        description: 'Transfer records, receipts, or settlement attempts.',
      },
    ],
  },
  'consumer complaint': {
    required: [
      {
        type: 'purchase-proof',
        label: 'Purchase proof',
        description: 'Invoice, receipt, or proof of purchase.',
      },
      {
        type: 'product-service-record',
        label: 'Product or service record',
        description: 'Warranty, service agreement, or service terms.',
      },
      {
        type: 'complaint-record',
        label: 'Complaint or support communication',
        description: 'Complaint ticket, email, chat, or written grievance.',
      },
    ],
    optional: [
      {
        type: 'refund-request',
        label: 'Refund or replacement request',
        description: 'Request for remedy, cancellation, or replacement.',
      },
      {
        type: 'photo-proof',
        label: 'Photo or screenshot proof',
        description: 'Images or screenshots showing the defect or misrepresentation.',
      },
    ],
  },
}

const jurisdictionEnhancers = {
  'supreme court': [
    {
      type: 'prior-order',
      label: 'Prior order or lower-court decision',
      description: 'Relevant lower-court orders or appellate history.',
    },
  ],
  'federal court': [
    {
      type: 'jurisdiction-basis',
      label: 'Jurisdiction basis record',
      description: 'Document showing federal jurisdiction or statutory basis.',
    },
  ],
}

function dedupeChecklist(items) {
  const seen = new Set()
  return items.filter((item) => {
    if (seen.has(item.type)) return false
    seen.add(item.type)
    return true
  })
}

export function getDocumentChecklist(category = '', jurisdiction = '') {
  const normalizedCategory = String(category || '').trim().toLowerCase()
  const normalizedJurisdiction = String(jurisdiction || '').trim().toLowerCase()

  const categoryConfig = checklistByCategory[normalizedCategory] || {}
  const jurisdictionRequired = jurisdictionEnhancers[normalizedJurisdiction] || []

  return {
    required: dedupeChecklist([
      ...defaultChecklist.required,
      ...(categoryConfig.required || []),
      ...jurisdictionRequired,
    ]),
    optional: dedupeChecklist([
      ...defaultChecklist.optional,
      ...(categoryConfig.optional || []),
    ]),
  }
}
