import { useEffect, useMemo, useState } from 'react'

export type ThemeMode = 'dark' | 'light'

const THEME_STORAGE_KEY = 'jurismind-theme-mode'

function getInitialThemeMode(): ThemeMode {
  const saved = localStorage.getItem(THEME_STORAGE_KEY)
  return saved === 'light' ? 'light' : 'dark'
}

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode)

  const isDarkMode = useMemo(() => themeMode === 'dark', [themeMode])

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode)
  }, [themeMode])

  useEffect(() => {
    const root = document.documentElement
    if (isDarkMode) {
      root.classList.remove('light-theme')
    } else {
      root.classList.add('light-theme')
    }
  }, [isDarkMode])

  return {
    themeMode,
    isDarkMode,
    toggleTheme: () =>
      setThemeMode((current) => (current === 'dark' ? 'light' : 'dark')),
  }
}
