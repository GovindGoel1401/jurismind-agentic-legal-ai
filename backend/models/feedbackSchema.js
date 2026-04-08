import mongoose from 'mongoose'

const feedbackSchema = new mongoose.Schema(
  {
    case_input: {
      type: Object,
      required: true,
    },
    ai_verdict: {
      type: Object,
      required: true,
    },
    user_rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    verdict_accuracy: {
      type: String,
      enum: ['accurate', 'partially-accurate', 'incorrect'],
      default: undefined,
    },
    missed_section: {
      type: String,
      default: '',
    },
    missed_law: {
      type: String,
      default: '',
    },
    user_comment: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
)

export const FeedbackModel =
  mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema)
