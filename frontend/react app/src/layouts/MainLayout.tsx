import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

interface MainLayoutProps {
  children: ReactNode
  isDarkMode?: boolean
  onThemeToggle?: () => void
}

export default function MainLayout({
  children,
  isDarkMode = true,
  onThemeToggle,
}: MainLayoutProps) {
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-legal-bg text-legal-text">
      <Navbar
        isDarkMode={isDarkMode}
        onThemeToggle={onThemeToggle}
      />

      <motion.main
        className="flex-1 pt-20"
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          {children}
        </motion.div>
      </motion.main>
      <Footer />
    </div>
  )
}
