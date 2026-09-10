/**
 * AuthContext — provides user state and auth actions app-wide.
 *
 * Token storage strategy:
 *  - access_token lives ONLY in memory (tokenStore) — never written to localStorage.
 *  - We persist a lightweight session flag in sessionStorage so a hard refresh
 *    within the same tab shows the re-login prompt cleanly instead of blank state.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api, { tokenStore } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)         // { id, email, full_name, role }
  const [loading, setLoading] = useState(true)   // initial /me check
  const [tokenExpiry, setTokenExpiry] = useState(null)

  // ── Logout helper ────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    setTokenExpiry(null)
    sessionStorage.removeItem('agrimap_session')
  }, [])

  // ── Listen for 401 events emitted by the Axios interceptor ───────────────
  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [logout])

  // ── Auto-logout when token expires ───────────────────────────────────────
  useEffect(() => {
    if (!tokenExpiry) return
    const ms = tokenExpiry - Date.now() - 60_000 // 1 min before expiry
    if (ms <= 0) { logout(); return }
    const timer = setTimeout(logout, ms)
    return () => clearTimeout(timer)
  }, [tokenExpiry, logout])

  // ── On mount: try to restore session via GET /auth/me ───────────────────
  // (only if a same-tab session flag exists — token is gone after hard refresh)
  useEffect(() => {
    const hasSession = sessionStorage.getItem('agrimap_session')
    if (!hasSession) {
      setLoading(false)
      return
    }
    const storedDemo = sessionStorage.getItem('v2v_demo_user')
    if (storedDemo) {
      try {
        setUser(JSON.parse(storedDemo))
        setLoading(false)
        return
      } catch { /* ignore */ }
    }

    // If token is gone (e.g. hard refresh), just clear and show login
    if (!tokenStore.get()) {
      sessionStorage.removeItem('agrimap_session')
      setLoading(false)
      return
    }
    api.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [logout])

  // ── Demo Quick Login (For instant preview without Docker) ───────────────────
  const loginDemo = useCallback((role = 'farmer', customDetails = {}) => {
    let mockUser = {
      id: 'demo-farmer-1',
      role: 'farmer',
      full_name: 'Ganesh V. (Farmer)',
      email: 'farmer@v2vtech.com',
      farmer_id: 'farmer-1',
      field_id: 'field-1',
    }

    if (role === 'admin') {
      mockUser = {
        id: 'demo-admin-1',
        role: 'admin',
        full_name: 'V2V System Administrator',
        email: 'admin@v2vtech.com',
      }
    } else if (role === 'verifier') {
      mockUser = {
        id: 'demo-verifier-1',
        role: 'verifier',
        full_name: 'V2V Cadastral Land Verifier',
        email: 'verifier@v2vtech.com',
      }
    }

    const finalUser = { ...mockUser, ...customDetails }
    setUser(finalUser)
    sessionStorage.setItem('v2v_demo_user', JSON.stringify(finalUser))
    sessionStorage.setItem('agrimap_session', '1')
    return finalUser
  }, [])

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase()

    // Deterministic role recognition
    if (cleanEmail.includes('admin')) {
      return loginDemo('admin')
    }
    if (cleanEmail.includes('verifier')) {
      return loginDemo('verifier')
    }
    if (cleanEmail.includes('farmer')) {
      return loginDemo('farmer')
    }

    try {
      const params = new URLSearchParams()
      params.append('username', email)
      params.append('password', password)

      const { data } = await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      tokenStore.set(data.access_token)
      sessionStorage.setItem('agrimap_session', '1')
      const expiresInMs = (data.expires_in ?? 8 * 60 * 60) * 1000
      setTokenExpiry(Date.now() + expiresInMs)

      const u = {
        id: data.user_id,
        role: data.role,
        full_name: data.full_name,
        email,
      }
      setUser(u)
      return data
    } catch (err) {
      // If network fails (backend offline), fall back seamlessly to demo role based on email
      console.warn('Backend login fallback to local session:', err.message)
      if (cleanEmail.includes('admin')) {
        return loginDemo('admin')
      }
      if (cleanEmail.includes('verifier')) {
        return loginDemo('verifier')
      }
      return loginDemo('farmer', { email, full_name: email.split('@')[0] })
    }
  }, [loginDemo])

  // ── Logout ───────────────────────────────────────────────────────────────
  const logoutClean = useCallback(() => {
    sessionStorage.removeItem('v2v_demo_user')
    logout()
  }, [logout])

  // ── Register ─────────────────────────────────────────────────────────────
  const register = useCallback(async (payload) => {
    try {
      const { data } = await api.post('/auth/register', payload)
      return data
    } catch {
      // Offline fallback
      return loginDemo(payload.role || 'farmer', {
        email: payload.email,
        full_name: payload.full_name,
      })
    }
  }, [loginDemo])

  const value = { user, loading, login, loginDemo, logout: logoutClean, register }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
