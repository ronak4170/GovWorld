import React from 'react'
import { createRoot } from 'react-dom/client'
import './globals.css'
import App from './App'
import { preloadSpeechVoices } from '@/lib/speech'

preloadSpeechVoices()

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found in document')
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
