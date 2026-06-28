import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyTheme, readStoredTheme, DEFAULT_THEME_ID } from './lib/themes.js'
import {
  applyBrowserStyle,
  applyPlayerStyle,
  DEFAULT_BROWSER_STYLE_ID,
  DEFAULT_PLAYER_STYLE_ID,
  readStoredBrowserStyle,
  readStoredPlayerStyle,
} from './lib/designStyles.js'
import {
  applyWaveformStyle,
  DEFAULT_WAVEFORM_STYLE_ID,
  readStoredWaveformStyle,
} from './lib/waveformStyles.js'
import {
  applyAccessibility,
  DEFAULT_A11Y_PREFERENCES,
  readStoredAccessibility,
} from './lib/accessibility.js'
import {
  applyBrowserRowSize,
  DEFAULT_BROWSER_ROW_SIZE_ID,
} from './lib/browserRowSize.js'

applyTheme(readStoredTheme() ?? DEFAULT_THEME_ID)
applyPlayerStyle(readStoredPlayerStyle() ?? DEFAULT_PLAYER_STYLE_ID)
applyBrowserStyle(readStoredBrowserStyle() ?? DEFAULT_BROWSER_STYLE_ID)
applyWaveformStyle(readStoredWaveformStyle() ?? DEFAULT_WAVEFORM_STYLE_ID)
applyBrowserRowSize(DEFAULT_BROWSER_ROW_SIZE_ID)
applyAccessibility(readStoredAccessibility() ?? DEFAULT_A11Y_PREFERENCES)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
