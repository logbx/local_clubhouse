import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { disableCacheForDevelopment } from './utils/cache.ts'

// Enable cache prevention in development
disableCacheForDevelopment();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
