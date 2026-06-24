import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import adminLogo from './assets/admin_logo.png'

const favicon = document.getElementById('app-favicon')
if (favicon) {
  favicon.href = adminLogo
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
