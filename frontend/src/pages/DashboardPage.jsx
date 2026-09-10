import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { tokenStore } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import StatusBadge from '../components/ui/StatusBadge'
import Pagination from '../components/ui/Pagination'
import Modal from '../components/ui/Modal'
import toast from '../components/ui/Toast'

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1/websocket/ws/dashboard`

export default function DashboardPage() {
  const { user } = useAuth()

  const [projects, setProjects]       = useState([])
  const [projectFilter, setProjectFilter] = useState('')
  const [devices, setDevices]         = useState([])
  const [fields, setFields]           = useState([])
  const [total, setTotal]             = useState(0)
  const [skip, setSkip]               = useState(0)
  const [loading, setLoading]         = useState(true)
    const [fetchError, setFetchError] = useState(null)
  const [alerts, setAlerts]           = useState([])
  const [showCreate, setShowCreate]   = useState(false)

  // ── Fetch data ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [proj, dev, fld] = await Promise.all([
        api.get('/projects/', { params: { skip, limit: 10 } }),
        api.get('/devices/', { params: { skip: 0, limit: 5 } }),
        api.get('/fields/', { params: { skip: 0, limit: 100 } }),
      ])
      setProjects(proj.data.items ?? [])
      setTotal(proj.data.total ?? 0)
      setDevices(dev.data.items ?? [])
      setFields(fld.data.items ?? [])
      setFetchError(null)
    } catch (e) {
      console.warn('Backend offline, loading mock projects and fields:', e.message)
      // Graceful preview fallback
      const { INITIAL_PROJECTS, FIELD_1_GEOJSON } = await import('../lib/mockData')
      setProjects(INITIAL_PROJECTS)
      setTotal(INITIAL_PROJECTS.length)
      const mockField = FIELD_1_GEOJSON.features.find(f => f.properties?.entity_type === 'field')?.properties
      setFields(mockField ? [mockField] : [])
      setFetchError(null)
    } finally {
      setLoading(false)
    }
  }, [skip])

  useEffect(() => { fetchData() }, [fetchData])

  // ── WebSocket for live alerts ─────────────────────────────────────────────
  useEffect(() => {
    const token = tokenStore.get()
    if (!token) return

    const ws = new WebSocket(WS_URL)
    let pingInterval

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', token }))
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000)
    }
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'sensor_update' || msg.type === 'alert') {
          setAlerts(prev => [{ id: Date.now(), ...msg.payload }, ...prev].slice(0, 10))
        }
      } catch { /* ignore parse errors */ }
    }
    ws.onerror = () => {} // silently ignore — backend may not be running
    return () => {
      clearInterval(pingInterval)
      ws.close()
    }
  }, [])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalHa = fields.reduce((s, f) => s + (f.calculated_area_hectares ?? 0), 0)
  const pendingFields = fields.filter(f => f.verification_status === 'pending').length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user?.full_name}</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'verifier') && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            + New Project
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Projects" value={total} icon="📁" color="blue" />
        <StatCard label="Fields Mapped" value={fields.length} icon="🗺️" color="green" />
        <StatCard label="Hectares Mapped" value={totalHa.toFixed(1)} icon="📐" color="yellow" />
        <StatCard label="Pending Review" value={pendingFields} icon="⏳" color="orange" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Projects table */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Projects</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : fetchError ? (
            <div className="text-center py-8">
              <div className="text-sm text-red-600 mb-3">Failed to load projects.</div>
              <button onClick={fetchData} className="btn-secondary">Retry</button>
            </div>
          ) : projects.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No projects yet.</p>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-3">
                <input
                  className="input-field max-w-sm"
                  placeholder="Search projects by name"
                  value={projectFilter}
                  onChange={e => setProjectFilter(e.target.value)}
                />
                <div className="text-xs text-gray-500">{projects.length} total</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      <th className="pb-3 pr-4">Name</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Start</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {projects.filter(p => !projectFilter || (p.name||'').toLowerCase().includes(projectFilter.toLowerCase())).map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-4 font-medium text-gray-900 max-w-xs truncate">
                          {p.name}
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="py-3 pr-4 text-gray-500">
                          {p.start_date ?? '—'}
                        </td>
                        <td className="py-3">
                          <Link
                            to={`/projects/${p.id}`}
                            className="text-brand-600 hover:text-brand-700 font-medium text-xs"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination total={total} skip={skip} limit={10} onPageChange={setSkip} />
            </>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Devices */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 text-sm">IoT Devices</h2>
              <Link to="/iot" className="text-xs text-brand-600 hover:text-brand-700">View all →</Link>
            </div>
            {devices.length === 0 ? (
              <p className="text-xs text-gray-400">No devices registered.</p>
            ) : (
              <ul className="space-y-2">
                {devices.slice(0, 5).map(d => (
                  <li key={d.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-800 truncate max-w-[140px]">{d.device_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {d.is_active ? 'active' : 'offline'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Live alerts */}
          <div className="card p-4">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">Live Alerts</h2>
            {alerts.length === 0 ? (
              <p className="text-xs text-gray-400">Listening for real-time alerts…</p>
            ) : (
              <ul className="space-y-2">
                {alerts.map(a => (
                  <li key={a.id} className="text-xs text-gray-700 bg-yellow-50 rounded-lg p-2 border border-yellow-100">
                    {a.message ?? JSON.stringify(a)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchData() }}
        />
      )}
    </div>
  )
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  const colors = {
    blue:   'bg-blue-50 border-blue-100 text-blue-700',
    green:  'bg-green-50 border-green-100 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-100 text-yellow-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
  }
  return (
    <div className={`card p-4 border ${colors[color]}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-0.5 opacity-80">{label}</div>
    </div>
  )
}

// ── Create Project Modal ──────────────────────────────────────────────────────
function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', description: '', status: 'planning',
    start_date: '', end_date: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = { ...form }
      if (!payload.start_date) delete payload.start_date
      if (!payload.end_date) delete payload.end_date
      await api.post('/projects/', payload)
      toast.success('Project created!')
      onCreated()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="New Project">
      {error && <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Project name *</label>
          <input required className="input-field" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea rows={3} className="input-field resize-none" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input-field" value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start date</label>
            <input type="date" className="input-field" value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div>
            <label className="label">End date</label>
            <input type="date" className="input-field" value={form.end_date}
              onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
