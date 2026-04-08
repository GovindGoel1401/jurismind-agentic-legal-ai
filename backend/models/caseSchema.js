import mongoose from 'mongoose'

const matchedDocumentSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    confidence: Number,
    inventoryStatus: String,
  },
  { _id: false },
)

const checklistItemSchema = new mongoose.Schema(
  {
    type: String,
    label: String,
    description: String,
    status: String,
    matchedDocument: {
      type: matchedDocumentSchema,
      default: null,
    },
  },
  { _id: false },
)

const uploadedDocumentSchema = new mongoose.Schema(
  {
    id: String,
    originalName: String,
    mimeType: String,
    sizeBytes: Number,
    detectedType: String,
    detectedCategory: String,
    description: String,
    confidence: Number,
    availabilityStatus: String,
    inventoryStatus: String,
    reliabilityLabel: String,
    usableForAnalysis: Boolean,
    classifierSource: String,
  },
  { _id: false },
)

const evidenceInventorySchema = new mongoose.Schema(
  {
    id: String,
    file_name: String,
    detected_type: String,
    category: String,
    basic_description: String,
    usable_for_analysis: Boolean,
    confidence: Number,
    reliability_label: String,
    inventory_status: String,
    size_bytes: Number,
  },
  { _id: false },
)

const caseSchema = new mongoose.Schema(
  {
    caseInput: {
      type: Object,
      required: true,
    },
    caseSubmission: {
      category: String,
      jurisdiction: String,
      descriptionLength: Number,
      uploadedDocumentCount: Number,
    },
    uploadedDocuments: {
      type: [uploadedDocumentSchema],
      default: [],
    },
    availableDocuments: {
      type: [checklistItemSchema],
      default: [],
    },
    missingDocuments: {
      type: [checklistItemSchema],
      default: [],
    },
    optionalDocuments: {
      type: [checklistItemSchema],
      default: [],
    },
    evidenceInventory: {
      type: [evidenceInventorySchema],
      default: [],
    },
    documentChecklist: {
      required: {
        type: [checklistItemSchema],
        default: [],
      },
      optional: {
        type: [checklistItemSchema],
        default: [],
      },
    },
    completenessScore: {
      type: Number,
      default: 0,
    },
    completenessExplanation: {
      type: String,
      default: '',
    },
    readinessStatus: {
      type: String,
      default: 'NOT_READY',
    },
    readinessAssessment: {
      label: String,
      summary: String,
    },
    initialReliabilityNotes: {
      type: [String],
      default: [],
    },
    workflowState: {
      type: Object,
      default: {},
    },
    analysisResult: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true },
)

export const CaseModel = mongoose.models.Case || mongoose.model('Case', caseSchema)
