import mongoose from 'mongoose'

const feedbackIntelligenceSchema = new mongoose.Schema(
  {
    feedback_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    case_id: {
      type: String,
      required: true,
      index: true,
    },
    session_id: {
      type: String,
      default: '',
      index: true,
    },
    phase_context: {
      type: String,
      default: 'general',
      index: true,
    },
    satisfaction_status: {
      type: String,
      default: 'unknown',
      index: true,
    },
    feedback_type: {
      type: String,
      required: true,
      index: true,
    },
    linked_feature_or_agent: {
      type: String,
      default: '',
      index: true,
    },
    linked_output_reference: {
      type: String,
      default: '',
    },
    user_rating: {
      type: Number,
      default: null,
      index: true,
    },
    verdict_helpful: {
      type: Boolean,
      default: null,
    },
    analysis_helpful: {
      type: Boolean,
      default: null,
    },
    debate_helpful: {
      type: Boolean,
      default: null,
    },
    document_guidance_helpful: {
      type: Boolean,
      default: null,
    },
    similar_cases_helpful: {
      type: Boolean,
      default: null,
    },
    issue_tags: {
      type: [String],
      default: [],
      index: true,
    },
    comment: {
      type: String,
      default: '',
    },
    case_signature: {
      type: Object,
      default: {},
    },
    payload: {
      type: Object,
      required: true,
      default: {},
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
    lesson_summary: {
      type: String,
      default: '',
      index: true,
    },
    lesson_category: {
      type: String,
      default: '',
      index: true,
    },
    missing_factor: {
      type: String,
      default: '',
    },
    trust_score: {
      type: Number,
      default: 0.5,
    },
    validation_status: {
      type: String,
      default: 'pending',
      index: true,
    },
    feedback_memory_indexed: {
      type: Boolean,
      default: false,
      index: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  },
)

export const FeedbackIntelligenceModel =
  mongoose.models.FeedbackIntelligence ||
  mongoose.model('FeedbackIntelligence', feedbackIntelligenceSchema)
