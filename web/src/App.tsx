import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Inbox } from './pages/Inbox'
import { TicketDetail } from './pages/TicketDetail'
import { Login } from './pages/Login'
import { AdminLogs } from './pages/AdminLogs'
import { ProtectedRoute } from './components/ProtectedRoute'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Inbox />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <ProtectedRoute>
              <TicketDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute>
              <AdminLogs />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
