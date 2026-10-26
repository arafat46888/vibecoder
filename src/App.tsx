import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Builder from './pages/Builder'
import SettingsModal from './components/SettingsModal'
import Toaster from './components/Toaster'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/builder" element={<Builder />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SettingsModal />
      <Toaster />
    </BrowserRouter>
  )
}
