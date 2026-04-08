import { motion } from 'framer-motion'
import { UserCheck, Star } from 'lucide-react'

export default function LawyerReview() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Lawyer Review</h1>
          <p className="text-primary-300 text-lg">
            Submit your case for professional attorney review
          </p>
        </div>

        {/* Review Request Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="card-legal mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <UserCheck size={24} className="text-gold-400" />
            <h2 className="text-2xl font-bold">Request Professional Review</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary-300 mb-2">
                Review Focus
              </label>
              <select className="w-full bg-primary-800 border border-primary-700 rounded-lg p-3 text-primary-100 focus:border-gold-400 focus:outline-none">
                <option>Overall Case Assessment</option>
                <option>Specific Legal Issue</option>
                <option>Trial Preparation</option>
                <option>Settlement Evaluation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-300 mb-2">
                Additional Comments
              </label>
              <textarea
                className="w-full bg-primary-800 border border-primary-700 rounded-lg p-3 text-primary-100 placeholder-primary-500 focus:border-gold-400 focus:outline-none"
                rows={6}
                placeholder="Describe your specific concerns or questions..."
              />
            </div>

            <button className="btn-legal w-full">Submit for Review</button>
          </div>
        </motion.div>

        {/* Lawyer Network */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="card-legal"
        >
          <h2 className="text-2xl font-bold mb-6">Available Attorneys</h2>

          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-primary-700/30 p-4 rounded-lg border border-primary-600/30">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold">Attorney Name {i}</p>
                    <p className="text-sm text-primary-400">Specialization: Corporate/Contract Law</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} size={16} className="text-gold-400 fill-gold-400" />
                    ))}
                  </div>
                </div>
                <button className="text-gold-400 text-sm hover:text-gold-300 transition-colors">
                  View Profile →
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
