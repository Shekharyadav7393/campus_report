import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Login from './pages/Login'
import Register from './pages/Register'
import StudentDashboard from './pages/StudentDashboard'
import AddComplaint from './pages/AddComplaint'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'

function PrivateRoute({ children, adminOnly = false }) {
  const { user, token } = useSelector((state) => state.auth)

  if (!token) {
    return <Navigate to={adminOnly ? '/admin/login' : '/login'} replace />
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  if (!adminOnly && user?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />
  }

  return children
}

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <StudentDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/complaints/add"
          element={
            <PrivateRoute>
              <AddComplaint />
            </PrivateRoute>
          }
        />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute adminOnly={true}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default App

