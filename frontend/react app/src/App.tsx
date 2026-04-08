import { BrowserRouter, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import RouteEffects from './components/shared/RouteEffects'
import { renderAppRoutes } from './config/routes'
import { useThemeMode } from './hooks/useThemeMode'
import { ActiveCaseProvider } from './context/ActiveCaseContext'

function App() {
  const { isDarkMode, toggleTheme } = useThemeMode()

  return (
    <ActiveCaseProvider>
      <BrowserRouter>
        <RouteEffects />
        <MainLayout
          isDarkMode={isDarkMode}
          onThemeToggle={toggleTheme}
        >
          <Routes>
            {renderAppRoutes()}
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </ActiveCaseProvider>
  )
}

export default App
