import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import FarmerDashboardPage from './pages/FarmerDashboardPage'
import FarmersManagementPage from './pages/FarmersManagementPage'
import AdminLandEditorPage from './pages/AdminLandEditorPage'
import DashboardPage from './pages/DashboardPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import MapViewPage from './pages/MapViewPage'
import IoTDashboardPage from './pages/IoTDashboardPage'
import DataToolsPage from './pages/DataToolsPage'
import UsersPage from './pages/UsersPage'

// Layout
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public Landing & Showcase */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Farmer Portal: Dedicated interactive farmland map (farmer, admin, verifier) */}
              <Route path="/farmer" element={<FarmerDashboardPage />} />

              {/* Admin & Verifier Management Console (blocked for farmer) */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'verifier']} />}>
                <Route path="/admin/farmers" element={<FarmersManagementPage />} />
                <Route path="/admin/editor/:fieldId" element={<AdminLandEditorPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
                <Route path="/map/:fieldId" element={<MapViewPage />} />
                <Route path="/iot" element={<IoTDashboardPage />} />
                <Route path="/iot/:fieldId" element={<IoTDashboardPage />} />
                <Route path="/data-tools" element={<DataToolsPage />} />
              </Route>

              {/* Admin only (System Access) */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

