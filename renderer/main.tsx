import '@shared/types/electron-api'
import '@/store/theme-store'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '@/app/App'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
