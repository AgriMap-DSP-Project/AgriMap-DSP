import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import V2VLogo from '../common/V2VLogo'

const NAV_LINKS = [
  { to: '/farmer',         label: 'Farmland Digital Twin',  icon: MapIcon,    roles: ['farmer', 'admin', 'verifier'] },
  { to: '/admin/farmers',  label: 'Farmers Directory',      icon: UsersIcon,  roles: ['admin', 'verifier'] },
  { to: '/admin/editor/field-1', label: 'Land & Drawing Editor', icon: EditIcon, roles: ['admin', 'verifier'] },
  { to: '/dashboard',      label: 'Platform Overview',      icon: HomeIcon,   roles: ['admin', 'verifier'] },
  { to: '/data-tools',     label: 'Export & Reports',       icon: UploadIcon, roles: ['admin', 'verifier'] },
  { to: '/users',          label: 'System Access',          icon: KeyIcon,    roles: ['admin'] },
]

export default function AppLayout() {
  const { user, loginDemo, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const currentRole = user?.role || 'farmer'
  const visibleLinks = NAV_LINKS.filter(l => l.roles.includes(currentRole))

  const handleRoleSwitch = (newRole) => {
    // Strict authentication: Farmers CANNOT switch to Admin or Verifier
    if (currentRole === 'farmer') {
      return
    }
    // Verifiers CANNOT switch to Admin
    if (currentRole === 'verifier' && newRole === 'admin') {
      return
    }

    loginDemo(newRole)
    if (newRole === 'farmer') navigate('/farmer')
    else if (newRole === 'admin' || newRole === 'verifier') navigate('/admin/farmers')
    else navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-v2v-softwhite flex">
      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-v2v-nearblack text-white flex flex-col border-r border-v2v-secondary/30 transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Logo */}
        <div className="px-5 py-4 border-b border-v2v-secondary/30 flex items-center justify-between">
          <Link to="/" className="hover:opacity-90 transition-opacity">
            <V2VLogo size="md" variant="light" />
          </Link>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-v2v-deep text-v2v-lavender border border-v2v-lavender/30 uppercase">
            DSP
          </span>
        </div>

        {/* Role Control Panel */}
        <div className="px-3 pt-3">
          {currentRole === 'farmer' ? (
            /* Authenticated Farmer View — No switching allowed */
            <div className="bg-v2v-charcoal p-2.5 rounded-xl border border-v2v-secondary/40 text-xs">
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                <span>AUTHENTICATED ROLE:</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[9px] font-bold">VERIFIED</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-base">🧑‍🌾</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs truncate">{user?.full_name || 'Ganesh V.'}</div>
                  <div className="text-[10px] text-v2v-lavender font-medium">Farmer · Single Farm Access</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1 border-t border-white/10 pt-1.5">
                <span>🔒</span>
                <span className="text-gray-400">Restricted to your registered land</span>
              </div>
            </div>
          ) : currentRole === 'verifier' ? (
            /* Verifier Role Switcher — Can switch to Farmer preview, but NOT to Admin */
            <div className="bg-v2v-charcoal p-2 rounded-xl border border-v2v-secondary/40 text-xs">
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                <span>ACTIVE ROLE:</span>
                <span className="font-bold text-v2v-lavender uppercase">{currentRole}</span>
              </div>
              <select
                value={currentRole}
                onChange={(e) => handleRoleSwitch(e.target.value)}
                className="w-full bg-v2v-nearblack text-white border border-v2v-secondary/50 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-v2v-lavender cursor-pointer"
              >
                <option value="verifier">🛡️ Verifier (Land Verification)</option>
                <option value="farmer">🧑‍🌾 Farmer View (Preview)</option>
              </select>
            </div>
          ) : (
            /* Admin Role Switcher — Full control */
            <div className="bg-v2v-charcoal p-2 rounded-xl border border-v2v-secondary/40 text-xs">
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                <span>ACTIVE ROLE:</span>
                <span className="font-bold text-v2v-lavender uppercase">{currentRole}</span>
              </div>
              <select
                value={currentRole}
                onChange={(e) => handleRoleSwitch(e.target.value)}
                className="w-full bg-v2v-nearblack text-white border border-v2v-secondary/50 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-v2v-lavender cursor-pointer"
              >
                <option value="admin">⚙️ Admin (Full Control)</option>
                <option value="verifier">🛡️ Land Verifier</option>
                <option value="farmer">🧑‍🌾 Farmer View</option>
              </select>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-gray-400 px-3 uppercase tracking-wider mb-2">
            Platform Navigation
          </div>
          {visibleLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all
                ${isActive
                  ? 'bg-v2v-gradient text-white shadow-md shadow-v2v-lavender/25'
                  : 'text-gray-300 hover:bg-v2v-electric/50 hover:text-white'}`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0 text-v2v-lavender" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User info footer */}
        <div className="px-4 py-4 border-t border-v2v-secondary/30 bg-v2v-charcoal/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-v2v-gradient flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {user?.full_name?.[0]?.toUpperCase() ?? 'V'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold truncate text-white">{user?.full_name}</div>
              <div className="text-[10px] text-v2v-lavender capitalize">{currentRole} portal</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <Link to="/" className="text-gray-400 hover:text-white text-[11px]">
              🌐 Landing
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-rose-400 text-[11px] transition-colors"
            >
              Sign out →
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-v2v-lavendergray flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <V2VLogo size="sm" />
          </div>
          <span className="text-xs font-semibold px-2 py-1 rounded bg-purple-50 text-v2v-deep capitalize">
            {currentRole}
          </span>
        </header>

        <main className="flex-1 overflow-auto bg-v2v-softwhite">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// ── Inline SVG icons ──
function MapIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  )
}
function EditIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}
function HomeIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}
function ChipIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H7a2 2 0 00-2 2v2M9 3h6M9 3v2m6-2h2a2 2 0 012 2v2m0 0v6m0-6H3m18 0H3m0 6v2a2 2 0 002 2h2m0 0h6m-6 0v2m6-2h2a2 2 0 002-2v-2m0 0V9" />
    </svg>
  )
}
function UploadIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )
}
function UsersIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}
function KeyIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  )
}
function MenuIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

