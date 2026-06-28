import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyTheme, readStoredTheme, DEFAULT_THEME_ID } from './lib/themes.js'

applyTheme(readStoredTheme() ?? DEFAULT_THEME_ID)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
