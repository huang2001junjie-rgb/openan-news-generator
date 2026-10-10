import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'openan-theme'

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(theme: Theme) {
  const isDark = theme === 'dark' || (theme === 'system' && getSystemDark())
  document.documentElement.classList.toggle('dark', isDark)
}

/** Read initial theme from localStorage or default to system. */
function readStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)

  // Apply on mount and whenever theme changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Listen for OS preference changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next)
    setThemeState(next)
  }, [])

  const toggle = useCallback(() => {
    const isDark = theme === 'dark' || (theme === 'system' && getSystemDark())
    setTheme(isDark ? 'light' : 'dark')
  }, [theme, setTheme])

  const isDark = theme === 'dark' || (theme === 'system' && getSystemDark())

  return { theme, isDark, setTheme, toggle }
}
