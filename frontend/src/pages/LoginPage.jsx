import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import V2VLogo from '../components/common/V2VLogo'

export default function LoginPage() {
  const { login, loginDemo, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeRoleTab, setActiveRoleTab] = useState('farmer')

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (from) {
        navigate(from, { replace: true })
      } else if (user.role === 'farmer') {
        navigate('/farmer', { replace: true })
      } else if (user.role === 'admin' || user.role === 'verifier') {
        navigate('/admin/farmers', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [user, from, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const loggedUser = await login(form.email, form.password)
      if (loggedUser?.role === 'farmer') {
        navigate('/farmer', { replace: true })
      } else if (loggedUser?.role === 'admin' || loggedUser?.role === 'verifier') {
        navigate('/admin/farmers', { replace: true })
      } else {
        navigate(from ?? '/dashboard', { replace: true })
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Invalid credentials. Please try again or use Quick Demo.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRoleTab = (role) => {
    setActiveRoleTab(role)
    if (role === 'farmer') {
      setForm({ email: 'farmer@v2vtech.com', password: 'farmer123' })
    } else if (role === 'admin') {
      setForm({ email: 'admin@v2vtech.com', password: 'admin123' })
    } else if (role === 'verifier') {
      setForm({ email: 'verifier@v2vtech.com', password: 'verifier123' })
    }
  }

  const handleQuickLogin = (role) => {
    setActiveRoleTab(role)
    const loggedUser = loginDemo(role)
    if (role === 'farmer') {
      navigate('/farmer', { replace: true })
    } else if (role === 'admin') {
      navigate('/admin/farmers', { replace: true })
    } else if (role === 'verifier') {
      navigate('/admin/farmers', { replace: true })
    }
  }

  // Pre-fill initial farmer credentials on mount
  useEffect(() => {
    setForm({ email: 'farmer@v2vtech.com', password: 'farmer123' })
  }, [])

  return (
    <div className="min-h-screen bg-[#0F0421] bg-gradient-to-br from-[#120326] via-[#2A0C58] to-[#0A0017] flex items-center justify-center p-4 relative overflow-hidden selection:bg-purple-500 selection:text-white">
      {/* Background Decorative Neon Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-v2v-electric/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-700/20 rounded-full blur-3xl pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />

      <div className="w-full max-w-md relative z-10 my-8">
        {/* Top Brand Banner */}
        <div className="text-center mb-6 flex flex-col items-center">
          <Link to="/" className="inline-block transform hover:scale-105 transition-all duration-300">
            <V2VLogo size="lg" variant="light" />
          </Link>
          <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-900/60 text-purple-200 text-xs font-semibold border border-purple-500/30 backdrop-blur-md shadow-lg shadow-purple-950/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Smart Agriculture · Digital Land Twin Platform</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/60 p-7 sm:p-9 border border-purple-100 relative overflow-hidden transition-all duration-300 hover:shadow-purple-950/50">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-extrabold text-v2v-deep tracking-tight">
                Sign In to Platform
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Access your farmland digital twin & verified boundaries
              </p>
            </div>
            <Link 
              to="/" 
              className="text-xs font-semibold text-purple-600 hover:text-purple-800 px-2.5 py-1 rounded-lg hover:bg-purple-50 transition-colors"
            >
              ← Home
            </Link>
          </div>

          {/* Quick Demo Access Bar */}
          <div className="mb-6 p-3 bg-gradient-to-br from-purple-50/90 via-v2v-softwhite to-indigo-50/70 rounded-2xl border border-purple-100/80 space-y-2 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-v2v-deep uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-amber-500">⚡</span> 1-Click Instant Demo Login:
              </span>
              <span className="text-[10px] text-purple-600 font-semibold bg-purple-100/60 px-2 py-0.5 rounded-md">
                Pre-authenticated
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* Farmer Option */}
              <button
                type="button"
                onClick={() => handleQuickLogin('farmer')}
                className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between group cursor-pointer ${
                  activeRoleTab === 'farmer'
                    ? 'bg-gradient-to-br from-v2v-deep via-purple-800 to-v2v-secondary text-white border-purple-500 shadow-lg shadow-purple-900/30 scale-[1.03]'
                    : 'bg-white text-gray-700 border-purple-100/80 hover:border-purple-300 hover:bg-purple-50/50 hover:scale-[1.01] hover:shadow-md'
                }`}
                title="Log in as Farmer (Farmland Twin only)"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xl group-hover:scale-110 transition-transform">🧑‍🌾</span>
                  {activeRoleTab === 'farmer' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <div className="font-extrabold text-xs mt-2 leading-tight">Farmer</div>
                <div className={`text-[10px] mt-0.5 font-medium ${activeRoleTab === 'farmer' ? 'text-purple-200' : 'text-gray-400'}`}>
                  Ganesh V. (Twin)
                </div>
              </button>

              {/* Admin Option */}
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between group cursor-pointer ${
                  activeRoleTab === 'admin'
                    ? 'bg-gradient-to-br from-v2v-deep via-purple-800 to-v2v-secondary text-white border-purple-500 shadow-lg shadow-purple-900/30 scale-[1.03]'
                    : 'bg-white text-gray-700 border-purple-100/80 hover:border-purple-300 hover:bg-purple-50/50 hover:scale-[1.01] hover:shadow-md'
                }`}
                title="Log in as Admin (Full Platform Control)"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xl group-hover:scale-110 transition-transform">⚙️</span>
                  {activeRoleTab === 'admin' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <div className="font-extrabold text-xs mt-2 leading-tight">Admin</div>
                <div className={`text-[10px] mt-0.5 font-medium ${activeRoleTab === 'admin' ? 'text-purple-200' : 'text-gray-400'}`}>
                  Full Control
                </div>
              </button>

              {/* Verifier Option */}
              <button
                type="button"
                onClick={() => handleQuickLogin('verifier')}
                className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between group cursor-pointer ${
                  activeRoleTab === 'verifier'
                    ? 'bg-gradient-to-br from-v2v-deep via-purple-800 to-v2v-secondary text-white border-purple-500 shadow-lg shadow-purple-900/30 scale-[1.03]'
                    : 'bg-white text-gray-700 border-purple-100/80 hover:border-purple-300 hover:bg-purple-50/50 hover:scale-[1.01] hover:shadow-md'
                }`}
                title="Log in as Verifier (Cadastral & Land Verification)"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xl group-hover:scale-110 transition-transform">🛡️</span>
                  {activeRoleTab === 'verifier' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <div className="font-extrabold text-xs mt-2 leading-tight">Verifier</div>
                <div className={`text-[10px] mt-0.5 font-medium ${activeRoleTab === 'verifier' ? 'text-purple-200' : 'text-gray-400'}`}>
                  Land Officer
                </div>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center pt-0.5">
              Click any role card to launch immediately, or enter credentials below
            </p>
          </div>

          <div className="relative flex py-1 items-center mb-5">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-3 text-gray-400 text-xs font-medium">or continue with email</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <span className="text-rose-500 font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                placeholder="farmer@v2vfarm.in"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-purple-600 hover:text-purple-800 font-semibold"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none transition-all pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  {showPassword ? '👁️' : '🔒'}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-3 mt-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-v2v-deep via-purple-700 to-v2v-lavender shadow-lg shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              {loading ? 'Authenticating…' : 'Sign in to AgriMap DSP →'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6 pt-4 border-t border-gray-100">
            Don't have an account yet?{' '}
            <Link to="/register" className="text-purple-700 hover:text-purple-900 font-bold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

