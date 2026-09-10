/**
 * Axios instance with JWT interceptor.
 * - Reads token from memory (authStore), never from localStorage for the token itself.
 * - On 401, clears auth state and redirects to /login.
 */
import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
})

// ---- Token store (in-memory) ----
let _token = null

export const tokenStore = {
  get: () => _token,
  set: (t) => { _token = t },
  clear: () => { _token = null },
}

// ---- Request interceptor: attach bearer token ----
api.interceptors.request.use(
  (config) => {
    const token = tokenStore.get()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ---- Response interceptor: handle 401 ----
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clear()
      // Dispatch a custom event so AuthContext can react
      window.dispatchEvent(new CustomEvent('auth:logout'))
    }
    return Promise.reject(error)
  }
)

export default api
