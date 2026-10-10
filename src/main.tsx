 import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Apply theme before render to avoid FOUC
;(function initTheme() {
  const stored = localStorage.getItem('openan-theme') || 'system'
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = stored === 'dark' || (stored === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark)
})()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
