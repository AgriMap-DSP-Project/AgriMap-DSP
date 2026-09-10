import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

/**
 * ProtectedRoute
 *  - No props: blocks unauthenticated users → /login
 *  - allowedRoles prop: blocks users without the right role → /dashboard
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-v2v-softwhite">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-v2v-lavender border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-v2v-deep">Authenticating Session…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'farmer') {
      return <Navigate to="/farmer" replace />
    }
    if (user.role === 'verifier') {
      return <Navigate to="/admin/farmers" replace />
    }
    return <Navigate to="/farmer" replace />
  }

  return <Outlet />
}
