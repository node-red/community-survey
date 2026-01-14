import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Disable browser's automatic scroll restoration on reload/back/forward
// This prevents race conditions with our controlled scroll-to-hash logic
// Our popstate handler in TableOfContents.jsx handles back/forward navigation
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
