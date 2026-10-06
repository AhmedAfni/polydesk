import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context';
import { ToastProvider } from './hooks';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { SubmitTicket } from './pages/SubmitTicket';
import { Inbox } from './pages/Inbox';
import { TicketDetail } from './pages/TicketDetail';
import { AdminLogs } from './pages/AdminLogs';
import { ProtectedRoute } from './components/ProtectedRoute';

export function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/submit" element={<SubmitTicket />} />
            <Route
              path="/inbox"
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
      </ToastProvider>
    </AppProvider>
  );
}

export default App;