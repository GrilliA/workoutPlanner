import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@auth'
import { ToastHost } from '@components/toast'
import './index.css'
import './styles/layout.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ToastHost />
      <App />
    </AuthProvider>
  </StrictMode>,
)
