import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import V2VLogo from '../components/common/V2VLogo'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'farmer',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/login', { state: { message: 'Account created successfully! Please sign in.' } })
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Registration failed. Please check your information and try again.')
    } finally {
      setLoading(false)
    }
  }

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
            <span>Smart Agriculture · New Member Registration</span>
          </div>
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/60 p-7 sm:p-9 border border-purple-100 relative overflow-hidden transition-all duration-300 hover:shadow-purple-950/50">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100">
            <div>
              <h2 className="text-xl font-extrabold text-v2v-deep tracking-tight">
                Create Account
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Join the V2V Smart Agriculture Platform
              </p>
            </div>
            <Link 
              to="/login" 
              className="text-xs font-semibold text-purple-600 hover:text-purple-800 px-2.5 py-1 rounded-lg hover:bg-purple-50 transition-colors"
            >
              Sign In →
            </Link>
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
                Full Name *
              </label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                placeholder="e.g. Ramesh Patel"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Email Address *
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
                  Password (min 8 chars) *
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
                  minLength={8}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none transition-all pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="new-password"
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

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Platform Role
              </label>
              <select
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none transition-all bg-white"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              >
                <option value="farmer">🧑‍🌾 Farmer / Land Owner</option>
                <option value="verifier">🛡️ Cadastral Land Verifier</option>
                <option value="admin">⚙️ Platform Administrator</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-3 mt-2 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-v2v-deep via-purple-700 to-v2v-lavender shadow-lg shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              {loading ? 'Creating Account…' : 'Create V2V Account →'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6 pt-4 border-t border-gray-100">
            Already registered on AgriMap DSP?{' '}
            <Link to="/login" className="text-purple-700 hover:text-purple-900 font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

