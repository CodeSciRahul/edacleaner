import '@shared/types/electron-api'
import '@/store/theme-store'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '@/app/App'
import '@/styles/globals.css'

function dismissBootSplash(): void {
  const splash = document.getElementById('boot-splash')
  if (!splash) return
  splash.setAttribute('data-hide', 'true')
  window.setTimeout(() => splash.remove(), 220)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

dismissBootSplash()

