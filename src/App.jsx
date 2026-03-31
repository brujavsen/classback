import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ClassView from './pages/ClassView'
import SpaceChat from './pages/SpaceChat'
import Profile from './pages/Profile'
import CompleteProfile from './pages/CompleteProfile'
import ResetPassword from './pages/ResetPassword'
import { useAuth } from './context/AuthContext'
import './App.css'

function ProtectedRoute({ children }) {
  const { user, needsProfileSetup, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (needsProfileSetup) return <Navigate to="/complete-profile" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/class/:classId" element={<ProtectedRoute><ClassView /></ProtectedRoute>} />
        <Route path="/class/:classId/space/:spaceId" element={<ProtectedRoute><SpaceChat /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  )
}

export default App
