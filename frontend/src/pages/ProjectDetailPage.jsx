import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import StatusBadge from '../components/ui/StatusBadge'
import Pagination from '../components/ui/Pagination'
import Modal from '../components/ui/Modal'
import toast from '../components/ui/Toast'
import VerificationDrawer from '../components/verification/VerificationDrawer'

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [fields, setFields]   = useState([])
  const [fieldFilter, setFieldFilter] = useState('')
  const [farmers, setFarmers] = useState([])
  const [fieldTotal, setFieldTotal] = useState(0)
  const [fieldSkip, setFieldSkip]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const [showAddField, setShowAddField]   = useState(false)
  const [showAddFarmer, setShowAddFarmer] = useState(false)
  const [verifyTarget, setVerifyTarget]   = useState(null) // { type, item }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [proj, flds, farm] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get('/fields/', { params: { project_id: projectId, skip: fieldSkip, limit: 10 } }),
        api.get('/farmers/', { params: { skip: 0, limit: 50 } }),
      ])
      setProject(proj.data)
      setFields(flds.data.items ?? [])
      setFieldTotal(flds.data.total ?? 0)
      setFarmers(farm.data.items ?? [])
      setFetchError(null)
    } catch (e) {
      if (e.response?.status === 404) navigate('/dashboard')
      else setFetchError(e)
    } finally {
      setLoading(false)
    }
  }, [projectId, fieldSkip, navigate])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading && !project) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (fetchError && !project) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <div className="text-red-600 mb-4">Failed to load project details.</div>
        <button className="btn-secondary" onClick={fetchAll}>Retry</button>
      </div>
    )
  }

  const totalHa = fields.reduce((s, f) => s + (f.calculated_area_hectares ?? 0), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link to="/dashboard" className="hover:text-brand-600">Dashboard</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-900 font-medium">{project?.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
            {project && <StatusBadge status={project.status} />}
          </div>
          {project?.description && (
            <p className="text-gray-500 text-sm mt-1">{project.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {project?.start_date && `Start: ${project.start_date}`}
            {project?.end_date && ` · End: ${project.end_date}`}
          </p>
        </div>
        <div className="flex gap-2">
          {(user?.role === 'admin' || user?.role === 'verifier') && (
            <>
              <button onClick={() => setShowAddFarmer(true)} className="btn-secondary text-sm">
                + Farmer
              </button>
              <button onClick={() => setShowAddField(true)} className="btn-primary text-sm">
                + Field
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-brand-700">{fieldTotal}</div>
          <div className="text-xs text-gray-500 mt-1">Fields</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-brand-700">{totalHa.toFixed(1)}</div>
          <div className="text-xs text-gray-500 mt-1">Hectares</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-brand-700">{farmers.length}</div>
          <div className="text-xs text-gray-500 mt-1">Farmers</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Fields table */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Fields</h2>
          {fields.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No fields yet.</p>
          ) : (
            <>
              <div className="mb-3">
                <input className="input-field max-w-sm" placeholder="Search fields by name"
                  value={fieldFilter} onChange={e => setFieldFilter(e.target.value)} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      <th className="pb-3 pr-4">Name</th>
                      <th className="pb-3 pr-4">Area (ha)</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {fields.filter(f => !fieldFilter || (f.name||'').toLowerCase().includes(fieldFilter.toLowerCase())).map(f => (
                      <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-4 font-medium text-gray-900 truncate max-w-[180px]">
                          {f.name}
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {(f.calculated_area_hectares ?? 0).toFixed(2)}
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={f.verification_status} />
                        </td>
                        <td className="py-3 flex items-center gap-3">
                          <Link
                            to={`/map/${f.id}`}
                            className="text-brand-600 hover:text-brand-700 text-xs font-medium"
                          >
                            Map →
                          </Link>
                          {(user?.role === 'verifier' || user?.role === 'admin') &&
                            f.verification_status === 'pending' && (
                            <button
                              onClick={() => setVerifyTarget({ type: 'fields', item: f })}
                              className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                            >
                              Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination total={fieldTotal} skip={fieldSkip} limit={10} onPageChange={setFieldSkip} />
            </>
          )}
        </div>

        {/* Farmers */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Farmers</h2>
          {farmers.length === 0 ? (
            <p className="text-sm text-gray-400">No farmers added yet.</p>
          ) : (
            <ul className="space-y-3">
              {farmers.slice(0, 10).map(f => (
                <li key={f.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {f.full_name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{f.full_name}</div>
                    <div className="text-xs text-gray-500">{f.contact_number}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddField && (
        <AddFieldModal
          projectId={projectId}
          farmers={farmers}
          onClose={() => setShowAddField(false)}
          onCreated={() => { setShowAddField(false); fetchAll() }}
        />
      )}
      {showAddFarmer && (
        <AddFarmerModal
          onClose={() => setShowAddFarmer(false)}
          onCreated={() => { setShowAddFarmer(false); fetchAll() }}
        />
      )}

      {/* Verification drawer */}
      {verifyTarget && (
        <VerificationDrawer
          resourceType={verifyTarget.type}
          item={verifyTarget.item}
          onClose={() => setVerifyTarget(null)}
          onVerified={() => { setVerifyTarget(null); fetchAll() }}
        />
      )}
    </div>
  )
}

// ── Add Field Modal ───────────────────────────────────────────────────────────
function AddFieldModal({ projectId, farmers, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    calculated_area_hectares: '',
    crop_history_summary: '',
    farmer_id: '',
    boundary: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let boundary
      try {
        boundary = JSON.parse(form.boundary)
      } catch {
        throw new Error('Boundary must be valid GeoJSON. Example: {"type":"MultiPolygon","coordinates":[[[[lon,lat],...]]]}')
      }
      if (boundary.type !== 'MultiPolygon') {
        throw new Error('Boundary type must be "MultiPolygon"')
      }
      await api.post('/fields/', {
        name: form.name,
        calculated_area_hectares: parseFloat(form.calculated_area_hectares),
        crop_history_summary: form.crop_history_summary || undefined,
        project_id: projectId,
        farmer_id: form.farmer_id,
        boundary,
      })
      toast.success('Field created!')
      onCreated()
    } catch (err) {
      const detail = err.response?.data?.detail ?? err.message
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail))
    } finally {
      setLoading(false)
    }
  }

  const exampleBoundary = JSON.stringify({
    type: 'MultiPolygon',
    coordinates: [[[[80.2707, 13.0827],[80.2720, 13.0827],[80.2720, 13.0840],[80.2707, 13.0840],[80.2707, 13.0827]]]]
  })

  return (
    <Modal open onClose={onClose} title="Add Field" maxWidth="max-w-2xl">
      {error && <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Field name *</label>
            <input required className="input-field" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Area (hectares) *</label>
            <input required type="number" step="0.001" min="0.001" className="input-field"
              value={form.calculated_area_hectares}
              onChange={e => setForm(f => ({ ...f, calculated_area_hectares: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="label">Farmer *</label>
          <select required className="input-field" value={form.farmer_id}
            onChange={e => setForm(f => ({ ...f, farmer_id: e.target.value }))}>
            <option value="">Select farmer…</option>
            {farmers.map(fa => (
              <option key={fa.id} value={fa.id}>{fa.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Crop history</label>
          <input className="input-field" value={form.crop_history_summary}
            onChange={e => setForm(f => ({ ...f, crop_history_summary: e.target.value }))} />
        </div>
        <div>
          <label className="label">Boundary GeoJSON (MultiPolygon) *</label>
          <textarea
            required
            rows={5}
            className="input-field resize-none font-mono text-xs"
            placeholder={exampleBoundary}
            value={form.boundary}
            onChange={e => setForm(f => ({ ...f, boundary: e.target.value }))}
          />
          <p className="text-xs text-gray-400 mt-1">
            Paste GeoJSON MultiPolygon. Coordinates are [longitude, latitude].
          </p>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Creating…' : 'Create field'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Add Farmer Modal ──────────────────────────────────────────────────────────
function AddFarmerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ full_name: '', contact_number: '', email: '', address: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/farmers/', form)
      toast.success('Farmer added!')
      onCreated()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Add Farmer">
      {error && <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Full name *</label>
          <input required className="input-field" value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Contact number *</label>
          <input required className="input-field" value={form.contact_number}
            onChange={e => setForm(f => ({ ...f, contact_number: e.target.value }))} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input-field" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="label">Address</label>
          <input className="input-field" value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Saving…' : 'Add farmer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
