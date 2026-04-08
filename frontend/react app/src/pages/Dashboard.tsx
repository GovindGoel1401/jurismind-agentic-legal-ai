import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp } from 'lucide-react'

const mockDashboardData = [
  { label: 'Total Cases Analyzed', value: '1,234', change: '+12%' },
  { label: 'Research Hours Saved', value: '456', change: '+28%' },
  { label: 'Accuracy Rate', value: '99.2%', change: '+2.5%' },
]

export default function Dashboard() {
  const [selectedMetric, setSelectedMetric] = useState(0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-4">Your Dashboard</h1>
        <p className="text-primary-300 mb-12">
          Monitor your case analysis and research metrics
        </p>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {mockDashboardData.map((metric, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={() => setSelectedMetric(index)}
              className={`card-legal cursor-pointer ${
                selectedMetric === index ? 'ring-2 ring-gold-400' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-primary-400 text-sm">{metric.label}</p>
                  <p className="text-3xl font-bold mt-2">{metric.value}</p>
                </div>
                <div className="p-2 bg-gold-500/10 rounded-lg">
                  <TrendingUp size={24} className="text-gold-400" />
                </div>
              </div>
              <p className="text-gold-400 text-sm font-semibold">{metric.change}</p>
            </motion.div>
          ))}
        </div>

        {/* Chart Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="card-legal mb-12"
        >
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 size={24} className="text-gold-400" />
            <h2 className="text-2xl font-bold">Analytics Overview</h2>
          </div>
          <div className="h-64 bg-primary-700/30 rounded-lg flex items-center justify-center">
            <p className="text-primary-400">Chart visualization coming soon</p>
          </div>
        </motion.div>

        {/* Recent Cases */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="card-legal"
        >
          <h2 className="text-2xl font-bold mb-6">Recent Cases</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="bg-primary-700/50 p-4 rounded-lg hover:bg-primary-700 transition-colors">
                <p className="font-semibold mb-1">Case #{1000 + i}</p>
                <p className="text-primary-400 text-sm">Status: Under Analysis</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
