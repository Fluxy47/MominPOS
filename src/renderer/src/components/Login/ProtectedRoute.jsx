// src/components/ProtectedRoute.jsx
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../Context/AuthProvider'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <p>Loading...</p>

  return user ? children : <Navigate to="/login" state={{ from: location }} replace />
}

export default ProtectedRoute
