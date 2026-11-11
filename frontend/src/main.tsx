import React from 'react'
import ReactDOM from 'react-dom/client'
import { OwnerAccess } from './components/OwnerAccess'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './components/ui'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <OwnerAccess />
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
