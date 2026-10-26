import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Builder from './pages/Builder'
import SettingsModal from './components/SettingsModal'
import Toaster from './components/Toaster'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

/**
 * App root. HashRouter keeps everything static-host friendly (PRD §7: no
 * server-side routing) — /#/ is the landing page, /#/build is the builder.
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/build" element={<Builder />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <SettingsModal />
        <Toaster />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
