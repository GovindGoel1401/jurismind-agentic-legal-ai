import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

interface LandingLayoutProps {
  children: ReactNode
  isDarkMode?: boolean
  onThemeToggle?: () => void
}

export default function LandingLayout({
  children,
  isDarkMode = true,
  onThemeToggle,
}: LandingLayoutProps) {
  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'dark' : ''}`}>
      <Navbar isDarkMode={isDarkMode} onThemeToggle={onThemeToggle} />
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 bg-gradient-to-br from-primary-950 to-primary-900"
      >
        {children}
      </motion.main>
      <Footer />
    </div>
  )
}
