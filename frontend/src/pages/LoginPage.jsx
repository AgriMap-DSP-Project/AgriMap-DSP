import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from '../components/common/ThemeToggle'
import farmStorage from '../lib/farmStorage'

// Pre-defined Seeds & Crops list for Farmer Registration multi-select
const SEED_CROP_OPTIONS = [
  { id: 'rice', label: 'Basmati Rice (Paddy)', icon: '🌾' },
  { id: 'wheat', label: 'Wheat (Golden Grain)', icon: '🌾' },
  { id: 'cotton', label: 'Bt Cotton', icon: '🌿' },
  { id: 'sugarcane', label: 'Sugarcane', icon: '🍬' },
  { id: 'maize', label: 'Maize / Sweet Corn', icon: '🌽' },
  { id: 'groundnut', label: 'Groundnut / Peanut', icon: '🥜' },
  { id: 'vegetables', label: 'Tomatoes & Vegetables', icon: '🍅' },
  { id: 'mango', label: 'Mangoes & Orchards', icon: '🥭' },
  { id: 'chilli', label: 'Red Chillies & Spices', icon: '🌶️' },
  { id: 'soybean', label: 'Soybeans & Mustard', icon: '🌻' },
  { id: 'banana', label: 'Banana Plantation', icon: '🍌' },
  { id: 'potato', label: 'Potatoes & Tubers', icon: '🥔' },
]

export default function LoginPage() {
  const { login, loginDemo, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname

  // Gateway Mode: 'login' or 'register'
  const [mode, setMode] = useState('login')

  // Selected Persona Role: 'farmer' | 'consumer' | 'dealer' | 'admin'
  const [selectedRole, setSelectedRole] = useState('farmer')

  // Login Form
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // Farmer Registration Form
  const [farmerReg, setFarmerReg] = useState({
    full_name: '',
    age: '',
    area_region: '',
    contact_number: '',
    land_address: '',
    area_sq_acres: '',
    crops_yield: ['Basmati Rice (Paddy)', 'Bt Cotton'],
  })

  // Consumer Registration Form
  const [consumerReg, setConsumerReg] = useState({
    full_name: '',
    email: '',
    contact_number: '',
    area_place: '',
    city_address: '',
    produce_preference: 'Organic Fruits & Vegetables',
    password: '',
  })

  // Dealer Registration Form
  const [dealerReg, setDealerReg] = useState({
    business_name: '',
    contact_person: '',
    email: '',
    contact_number: '',
    area_place: '',
    gstin_license: '',
    region_territory: 'Gujarat & Western India',
    password: '',
  })

  // Admin Registration Form
  const [adminReg, setAdminReg] = useState({
    full_name: '',
    email: '',
    master_key: '',
    password: '',
  })

  // Registration Submitted Modal state
  const [submittedModal, setSubmittedModal] = useState(null)

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

  // Pre-fill demo credentials on role tab switch in Login Mode
  useEffect(() => {
    if (mode === 'login') {
      if (selectedRole === 'farmer') {
        setLoginForm({ email: 'farmer@v2vtech.com', password: 'farmer123' })
      } else if (selectedRole === 'admin') {
        setLoginForm({ email: 'admin@farmxt.com', password: 'admin123' })
      } else if (selectedRole === 'consumer') {
        setLoginForm({ email: 'consumer@farmxt.com', password: 'consumer123' })
      } else if (selectedRole === 'dealer') {
        setLoginForm({ email: 'dealer@farmxt.com', password: 'dealer123' })
      }
    }
  }, [mode, selectedRole])

  // Handle Login Submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    try {
      // Check stored custom credentials first
      const matchedCred = farmStorage.authenticateUser(loginForm.email, loginForm.password, selectedRole)

      if (matchedCred) {
        loginDemo(matchedCred.role, {
          email: matchedCred.email,
          full_name: matchedCred.full_name,
          farmer_id: matchedCred.farmer_id || 'farmer-1',
          field_id: matchedCred.field_id || 'field-1',
        })
        if (matchedCred.role === 'farmer') {
          navigate('/farmer', { replace: true })
        } else if (matchedCred.role === 'admin') {
          navigate('/admin/farmers', { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
        return
      }

      // Check if email belongs to a pending farmer registration
      const pendingList = farmStorage.getPendingFarmerRegistrations()
      const pendingFarmer = pendingList.find(p => p.contact_number.includes(loginForm.email) || p.full_name.toLowerCase().includes(loginForm.email.toLowerCase()))

      if (pendingFarmer) {
        setError(`⚠️ Registration Pending Admin Approval: Farmer "${pendingFarmer.full_name}" is currently awaiting Admin verification & credential creation. Farmer credentials are set ONLY by an Admin.`)
        setLoading(false)
        return
      }

      if (selectedRole === 'farmer') {
        setError('🛑 Access Restricted: Farmer credentials can ONLY be set & issued by an Admin. Please submit a registration request for Admin review or log in using your Admin-assigned credentials.')
        setLoading(false)
        return
      }

      // Fallback demo authentication for non-farmer roles
      const loggedUser = await login(loginForm.email, loginForm.password)
      if (loggedUser?.role === 'admin' || selectedRole === 'admin') {
        navigate('/admin/farmers', { replace: true })
      } else {
        navigate(from ?? '/dashboard', { replace: true })
      }
    } catch (err) {
      setError('Invalid credentials. Note: Farmer login credentials are set ONLY by an Admin.')
    } finally {
      setLoading(false)
    }
  }

  // Toggle Crop Multi-Select Choice
  const toggleCropSelection = (cropLabel) => {
    setFarmerReg(prev => {
      const exists = prev.crops_yield.includes(cropLabel)
      if (exists) {
        return { ...prev, crops_yield: prev.crops_yield.filter(c => c !== cropLabel) }
      } else {
        return { ...prev, crops_yield: [...prev.crops_yield, cropLabel] }
      }
    })
  }

  // Handle Register Submission
  const handleRegisterSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (selectedRole === 'farmer') {
      if (!farmerReg.full_name || !farmerReg.contact_number) {
        setError('Please enter your Name and Phone Number.')
        return
      }

      // Create Pending Farmer Registration Request
      const pendingReg = farmStorage.createPendingFarmerRegistration(farmerReg)

      setSubmittedModal({
        type: 'farmer',
        title: '🌾 Farmer Request Sent for Admin Approval!',
        name: pendingReg.full_name,
        details: [
          `Farmer Name: ${pendingReg.full_name}`,
          `Age: ${pendingReg.age || 'N/A'} years`,
          `Area / Region: ${pendingReg.area_region || 'N/A'}`,
          `Land Size: ${pendingReg.area_sq_acres}`,
          `Selected Crops: ${pendingReg.crops_yield.join(', ') || 'General Crops'}`,
          `🔑 Credential Status: PENDING ADMIN CREATION`,
        ],
        message: '🛡️ IMPORTANT: Farmer login credentials are set ONLY by an Admin. Your registration details have been sent to the Admin Management Platform. Once the Admin verifies your land survey and creates your credentials, you will receive your login details.',
      })
    } else if (selectedRole === 'consumer') {
      if (!consumerReg.full_name || !consumerReg.email) {
        setError('Please provide your Full Name and Email.')
        return
      }
      farmStorage.saveUserCredential({
        email: consumerReg.email,
        password: consumerReg.password || 'consumer123',
        role: 'consumer',
        full_name: consumerReg.full_name,
      })
      setSubmittedModal({
        type: 'consumer',
        title: '🛒 Consumer Account Created Successfully!',
        name: consumerReg.full_name,
        details: [`Email: ${consumerReg.email}`, `Area / Place: ${consumerReg.area_place || 'Not specified'}`, `Role: Direct Farm Produce Consumer`],
        message: 'Your consumer account is ready. You can now log in to order direct farm produce from verified FARM-XT growers.',
      })
    } else if (selectedRole === 'dealer') {
      if (!dealerReg.business_name || !dealerReg.email) {
        setError('Please provide your Business Name and Email.')
        return
      }
      farmStorage.saveUserCredential({
        email: dealerReg.email,
        password: dealerReg.password || 'dealer123',
        role: 'dealer',
        full_name: dealerReg.business_name,
      })
      setSubmittedModal({
        type: 'dealer',
        title: '🏢 Agri-Dealer Account Created Successfully!',
        name: dealerReg.business_name,
        details: [`Business: ${dealerReg.business_name}`, `Dealership Area / Place: ${dealerReg.area_place || dealerReg.region_territory}`],
        message: 'Your dealership portal account is active. You can log in to supply seeds, fertilizers, and IoT hardware to registered farmers.',
      })
    } else if (selectedRole === 'admin') {
      if (!adminReg.email) {
        setError('Please provide your Admin Email.')
        return
      }
      const adminName = adminReg.email.split('@')[0] || 'System Admin'
      farmStorage.saveUserCredential({
        email: adminReg.email,
        password: adminReg.password || 'admin123',
        role: 'admin',
        full_name: adminName,
      })
      setSubmittedModal({
        type: 'admin',
        title: '⚙️ Admin Credentials Generated!',
        name: adminName,
        details: [`Admin Email: ${adminReg.email}`, `Role: Master System Administrator`],
        message: 'Your admin account has been created. You can log in to review pending farmer registrations and manage platform boundaries.',
      })
    }
  }

  const targetHomePath = user ? (user.role === 'farmer' ? '/farmer' : (user.role === 'admin' || user.role === 'verifier' ? '/admin/farmers' : '/dashboard')) : '/'

  const handleGoBack = (e) => {
    if (e) e.preventDefault()
    if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
      navigate(-1)
    } else {
      setMode('login')
      setSelectedRole('farmer')
      setError('')
      setSuccessMsg('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-v2v-softwhite bg-gradient-to-br from-[#F4F3F9] via-[#E4DFEB] to-[#FFFFFF] dark:bg-[#0F0421] dark:bg-gradient-to-br dark:from-[#120326] dark:via-[#2A0C58] dark:to-[#0A0017] flex items-center justify-center p-4 relative overflow-hidden selection:bg-purple-500 selection:text-white transition-colors duration-200">
      {/* Top right header actions (Go Back & Theme toggle) */}
      <div className="absolute top-5 right-5 z-20 flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleGoBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-full text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 hover:bg-v2v-purple hover:text-white dark:hover:bg-purple-900/80 dark:hover:text-purple-200 border border-purple-200/80 dark:border-slate-700/80 backdrop-blur-md shadow-sm transition-all cursor-pointer"
          title="Go to previous page"
        >
          <span className="text-sm font-black">←</span>
          <span>Go Back</span>
        </button>
        <ThemeToggle variant="pill" />
      </div>

      {/* Background Decorative Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-purple-500/10 dark:bg-purple-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-v2v-lavender/30 dark:bg-v2v-electric/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-purple-400/20 dark:bg-purple-700/20 rounded-full blur-3xl pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />

      <div className="w-full max-w-xl relative z-10 my-6">
        {/* Top Brand Banner — Exact FARM-XT Logo & Styling */}
        <div className="text-center mb-6 flex flex-col items-center">
          <Link
            to="/"
            onClick={() => {
              setMode('login')
              setSelectedRole('farmer')
              setError('')
              setSuccessMsg('')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className="inline-flex items-center gap-3 select-none group transform hover:scale-105 transition-all duration-300 cursor-pointer"
          >
            <div className="relative flex-shrink-0">
              <img
                src="/images/v2v-icon.png"
                alt="FARM-XT Logo"
                className="h-14 w-14 object-contain filter drop-shadow-md group-hover:scale-110 transition-all duration-300"
              />
              <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
            <div className="flex flex-col text-left">
              <div className="font-black text-2xl tracking-tight leading-none flex items-center gap-1.5 text-v2v-deep dark:text-white">
                <span>FARM-XT</span>
                <span className="text-v2v-purple dark:text-purple-300 font-extrabold text-lg">DSP</span>
              </div>
              <div className="font-bold tracking-widest uppercase font-mono text-[10px] text-v2v-violet dark:text-purple-200/90 mt-0.5">
                Digital Farmland & Ecosystem Platform
              </div>
            </div>
          </Link>
          <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-v2v-deep/10 dark:bg-purple-900/60 text-v2v-deep dark:text-purple-200 text-xs font-semibold border border-v2v-purple/30 dark:border-purple-500/30 backdrop-blur-md shadow-lg shadow-v2v-deep/10 dark:shadow-purple-950/40">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span>V2V Agrilythos · Smart Agriculture Initiative</span>
          </div>
        </div>

        {/* Main Gateway Card */}
        <div className="card p-6 sm:p-8 border border-purple-100 dark:border-slate-800 shadow-2xl relative overflow-hidden transition-all duration-300">
          
          {/* Main Gateway Mode Selector (LOGIN vs REGISTER) */}
          <div className="flex items-center justify-between mb-6 p-1.5 rounded-2xl bg-v2v-softwhite border border-v2v-border">
            <button
              onClick={() => { setMode('login'); setError(''); setSuccessMsg('') }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 ${
                mode === 'login'
                  ? 'bg-v2v-gradient text-white shadow-md shadow-v2v-purple/30'
                  : 'text-gray-600 hover:text-v2v-deep'
              }`}
            >
              <span>🔑</span>
              <span>SIGN IN (LOGIN)</span>
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setSuccessMsg('') }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center justify-center gap-2 ${
                mode === 'register'
                  ? 'bg-v2v-gradient text-white shadow-md shadow-v2v-purple/30'
                  : 'text-gray-600 hover:text-v2v-deep'
              }`}
            >
              <span>📝</span>
              <span>CREATE ACCOUNT (REGISTER)</span>
            </button>
          </div>

          {/* 4 Role Selector Tabs (Farmer, Consumer, Dealer, Admin) */}
          <div className="mb-6">
            <div className="text-xs font-bold uppercase tracking-wider text-v2v-deep mb-2 flex items-center justify-between">
              <span>Select Your Role Portal:</span>
              <span className="text-[10px] text-purple-600 font-bold uppercase">Role: {selectedRole}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
              <button
                type="button"
                onClick={() => setSelectedRole('farmer')}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-0.5 ${
                  selectedRole === 'farmer'
                    ? 'bg-v2v-deep text-white shadow-md shadow-v2v-deep/30 ring-2 ring-purple-400'
                    : 'text-gray-700 hover:bg-white'
                }`}
              >
                <span className="text-sm">🧑‍🌾</span>
                <span>Farmer</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('consumer')}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-0.5 ${
                  selectedRole === 'consumer'
                    ? 'bg-v2v-deep text-white shadow-md shadow-v2v-deep/30 ring-2 ring-purple-400'
                    : 'text-gray-700 hover:bg-white'
                }`}
              >
                <span className="text-sm">🛒</span>
                <span>Consumer</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('dealer')}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-0.5 ${
                  selectedRole === 'dealer'
                    ? 'bg-v2v-deep text-white shadow-md shadow-v2v-deep/30 ring-2 ring-purple-400'
                    : 'text-gray-700 hover:bg-white'
                }`}
              >
                <span className="text-sm">🏢</span>
                <span>Dealer</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('admin')}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center gap-0.5 ${
                  selectedRole === 'admin'
                    ? 'bg-v2v-deep text-white shadow-md shadow-v2v-deep/30 ring-2 ring-purple-400'
                    : 'text-gray-700 hover:bg-white'
                }`}
              >
                <span className="text-sm">⚙️</span>
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-start gap-2.5 animate-fade-in">
              <span className="text-base flex-shrink-0">⚠️</span>
              <div className="flex-1">{error}</div>
            </div>
          )}
          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-start gap-2.5 animate-fade-in">
              <span className="text-base flex-shrink-0">✅</span>
              <div className="flex-1">{successMsg}</div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* MODE 1: LOGIN FORM                                           */}
          {/* ──────────────────────────────────────────────────────────── */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {selectedRole === 'farmer' && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-200 mb-2 flex items-start gap-2">
                  <span className="text-base flex-shrink-0">🔑</span>
                  <div>
                    <span className="font-extrabold block">Admin-Issued Farmer Credentials Only</span>
                    <span className="text-[11px] text-purple-800 dark:text-purple-300">Farmer login credentials are set & issued ONLY by an Admin upon registration approval.</span>
                  </div>
                </div>
              )}
              <div>
                <label className="label">
                  {selectedRole === 'farmer' ? 'Farmer Email / Registered ID:' : `${selectedRole.toUpperCase()} Email / Login:`}
                </label>
                <input
                  type="text"
                  required
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder={
                    selectedRole === 'farmer' ? 'farmer@v2vtech.com' :
                    selectedRole === 'admin' ? 'admin@farmxt.com' : `${selectedRole}@farmxt.com`
                  }
                  className="input-field"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">Password:</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-semibold text-v2v-purple hover:underline"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="input-field"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-v2v-gradient py-3 text-sm font-bold rounded-xl shadow-lg mt-2 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In as {selectedRole.toUpperCase()}</span>
                    <span>→</span>
                  </>
                )}
              </button>

              {/* Quick Fill Demo Helper */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500">Quick Demo Credentials:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedRole === 'farmer') setLoginForm({ email: 'farmer@v2vtech.com', password: 'farmer123' })
                    else if (selectedRole === 'admin') setLoginForm({ email: 'admin@farmxt.com', password: 'admin123' })
                    else if (selectedRole === 'consumer') setLoginForm({ email: 'consumer@farmxt.com', password: 'consumer123' })
                    else if (selectedRole === 'dealer') setLoginForm({ email: 'dealer@farmxt.com', password: 'dealer123' })
                  }}
                  className="text-v2v-purple font-bold hover:underline"
                >
                  Autofill {selectedRole} →
                </button>
              </div>
            </form>
          )}

          {/* ──────────────────────────────────────────────────────────── */}
          {/* MODE 2: REGISTER FORM                                        */}
          {/* ──────────────────────────────────────────────────────────── */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              
              {/* 1) FARMER REGISTRATION FORM */}
              {selectedRole === 'farmer' && (
                <>
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border-2 border-amber-300 dark:border-amber-700/60 text-xs text-amber-950 dark:text-amber-200 mb-3 shadow-sm">
                    <div className="font-extrabold text-amber-900 dark:text-amber-100 flex items-center gap-1.5 text-xs mb-1">
                      <span>🔒 ADMIN-ONLY CREDENTIAL CREATION</span>
                    </div>
                    <span>Farmer login credentials <strong>cannot be self-created</strong>. Submitting your farmland details sends a pending registration request to the Admin. The Admin will review your land survey and generate/issue your official login credentials.</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label">1) Farmer Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Patel"
                        value={farmerReg.full_name}
                        onChange={(e) => setFarmerReg({ ...farmerReg, full_name: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label">2) Age *</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 42"
                        value={farmerReg.age}
                        onChange={(e) => setFarmerReg({ ...farmerReg, age: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label">3) Area / Region *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Anand District, Gujarat"
                        value={farmerReg.area_region}
                        onChange={(e) => setFarmerReg({ ...farmerReg, area_region: e.target.value })}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label">4) Contact Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98452 11029"
                        value={farmerReg.contact_number}
                        onChange={(e) => setFarmerReg({ ...farmerReg, contact_number: e.target.value })}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">5) Land Physical Address *</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g. Survey No. 248/A, Near Sub-Station, Anand District, Gujarat 388001"
                      value={farmerReg.land_address}
                      onChange={(e) => setFarmerReg({ ...farmerReg, land_address: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="label">6) Total Land Area (Sq. Ft / Acres) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 18.5 Acres (805,860 sq. ft)"
                      value={farmerReg.area_sq_acres}
                      onChange={(e) => setFarmerReg({ ...farmerReg, area_sq_acres: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  {/* Multi-Select Crops Yield Section */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="label mb-0">7) Cultivated Seeds & Crops Yield *</label>
                      <span className="text-[10px] text-purple-700 font-bold">(Select multiple)</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 bg-gray-50 border border-gray-200 rounded-xl">
                      {SEED_CROP_OPTIONS.map((crop) => {
                        const isSelected = farmerReg.crops_yield.includes(crop.label)
                        return (
                          <button
                            type="button"
                            key={crop.id}
                            onClick={() => toggleCropSelection(crop.label)}
                            className={`p-2 rounded-lg text-left text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                              isSelected
                                ? 'bg-v2v-deep text-white border-purple-500 shadow-sm'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                            }`}
                          >
                            <span>{crop.icon}</span>
                            <span className="truncate">{crop.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* 2) CONSUMER REGISTRATION FORM */}
              {selectedRole === 'consumer' && (
                <>
                  <div>
                    <label className="label">Consumer Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ananya Sharma"
                      value={consumerReg.full_name}
                      onChange={(e) => setConsumerReg({ ...consumerReg, full_name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Area / Place / City Location *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anand, Gujarat / Sector 4"
                      value={consumerReg.area_place}
                      onChange={(e) => setConsumerReg({ ...consumerReg, area_place: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="consumer@farmxt.com"
                      value={consumerReg.email}
                      onChange={(e) => setConsumerReg({ ...consumerReg, email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Contact Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 12345"
                      value={consumerReg.contact_number}
                      onChange={(e) => setConsumerReg({ ...consumerReg, contact_number: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={consumerReg.password}
                      onChange={(e) => setConsumerReg({ ...consumerReg, password: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </>
              )}

              {/* 3) DEALER REGISTRATION FORM */}
              {selectedRole === 'dealer' && (
                <>
                  <div>
                    <label className="label">Dealership / Business Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AgriTech Fertilizer & Seed Traders"
                      value={dealerReg.business_name}
                      onChange={(e) => setDealerReg({ ...dealerReg, business_name: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Dealership Area / Operating Place *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anand & Kheda District, Gujarat"
                      value={dealerReg.area_place}
                      onChange={(e) => setDealerReg({ ...dealerReg, area_place: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Business Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="dealer@farmxt.com"
                      value={dealerReg.email}
                      onChange={(e) => setDealerReg({ ...dealerReg, email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">GSTIN / Business License No. *</label>
                    <input
                      type="text"
                      required
                      placeholder="GSTIN24AAACG1234F1Z5"
                      value={dealerReg.gstin_license}
                      onChange={(e) => setDealerReg({ ...dealerReg, gstin_license: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={dealerReg.password}
                      onChange={(e) => setDealerReg({ ...dealerReg, password: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </>
              )}

              {/* 4) ADMIN REGISTRATION FORM */}
              {selectedRole === 'admin' && (
                <>
                  <div>
                    <label className="label">Admin Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@farmxt.com"
                      value={adminReg.email}
                      onChange={(e) => setAdminReg({ ...adminReg, email: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={adminReg.password}
                      onChange={(e) => setAdminReg({ ...adminReg, password: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full btn-v2v-gradient py-3 text-sm font-bold rounded-xl shadow-lg mt-3 flex items-center justify-center gap-2"
              >
                <span>
                  {selectedRole === 'farmer'
                    ? 'Submit Request for Admin Credential Creation'
                    : `Submit ${selectedRole.toUpperCase()} Registration`}
                </span>
                <span>→</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Registration Submission Confirmation Modal ── */}
      {submittedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-purple-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-lg font-extrabold text-v2v-deep tracking-tight">{submittedModal.title}</h3>
              <button
                onClick={() => setSubmittedModal(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 text-xs text-purple-950 space-y-1">
              <div className="font-bold text-sm text-v2v-deep mb-1">Registration Summary:</div>
              {submittedModal.details.map((item, idx) => (
                <div key={idx} className="font-semibold">{item}</div>
              ))}
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              {submittedModal.message}
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setSubmittedModal(null)
                  setMode('login')
                }}
                className="btn-v2v-gradient text-xs py-2.5 px-5 rounded-xl font-bold"
              >
                Proceed to Sign In →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
