import { motion } from 'framer-motion'
import { FileText, Zap, Users, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Analyze() {
  const steps = [
    {
      icon: FileText,
      title: 'Case Input',
      description: 'Upload and organize your case documents',
      href: '/case-input',
    },
    {
      icon: Zap,
      title: 'AI Analysis',
      description: 'Get comprehensive AI-powered analysis',
      href: '/ai-analysis',
    },
    {
      icon: Scale,
      title: 'Debate',
      description: 'Simulate courtroom debates',
      href: '/debate',
    },
    {
      icon: Users,
      title: 'Lawyer Review',
      description: 'Get professional attorney feedback',
      href: '/lawyer-review',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-gold-400 to-gold-500 bg-clip-text text-transparent">
              Case Analysis Workflow
            </span>
          </h1>
          <p className="text-xl text-primary-300 max-w-2xl mx-auto">
            Follow our streamlined process to analyze your case with AI-powered insights and
            professional guidance
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Link
                  to={step.href}
                  className="relative group card-legal h-full"
                >
                  {/* Step Number */}
                  <div className="absolute -top-4 -left-4 w-10 h-10 bg-gold-500 text-primary-950 rounded-full flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                    {index + 1}
                  </div>

                  <Icon size={40} className="text-gold-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-primary-300">{step.description}</p>

                  <div className="mt-6 flex items-center text-gold-400 group-hover:translate-x-2 transition-transform">
                    <span className="text-sm font-semibold">Get Started</span>
                    <span className="ml-2">→</span>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Quick Start */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-gold-500/10 to-gold-400/5 border border-gold-500/30 rounded-lg p-8 text-center"
        >
          <h2 className="text-2xl font-bold mb-4">Ready to Analyze?</h2>
          <p className="text-primary-300 mb-6 max-w-2xl mx-auto">
            Start with uploading your case documents and let JurisMind AI guide you through the
            entire analysis process.
          </p>
          <Link to="/case-input" className="btn-legal inline-block">
            Start Now
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
