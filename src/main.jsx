import React from 'react'
import { createRoot } from 'react-dom/client'

import 'katex/dist/katex.min.css'
import './highlight.css'
import './styles.css'

import App from './App.jsx'

if (navigator.platform.toLowerCase().includes('mac')) {
  document.documentElement.classList.add('mac')
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
