/**
 * DataToolsPage — CSV bulk upload, GeoJSON upload, project export.
 */
import React, { useState, useRef, useEffect } from 'react'
import api from '../lib/api'
import toast from '../components/ui/Toast'

const CSV_TYPES = ['farmers', 'fields', 'resources', 'reference_points', 'observations']

export default function DataToolsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Tools</h1>
        <p className="text-sm text-gray-500 mt-1">Bulk import data and export project summaries.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <CSVUploader />
        <GeoJSONUploader />
        <ExifPhotoUploader />
        <ProjectExporter />
      </div>
    </div>
  )
}

// ── CSV Uploader ─────────────────────────────────────────────────────────────
function CSVUploader() {
  const [type, setType] = useState('farmers')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { toast.error('Select a CSV file'); return }
    setLoading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post(`/ingest/csv/${type}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
      toast.success(`CSV imported successfully`)
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'CSV import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-gray-900 mb-4">📊 CSV Bulk Import</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">Data type</label>
          <select className="input-field" value={type} onChange={e => setType(e.target.value)}>
            {CSV_TYPES.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div
          className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-brand-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <p className="text-sm text-gray-500">
            {file ? file.name : 'Click to select CSV file'}
          </p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <button type="submit" disabled={loading || !file} className="btn-primary w-full">
          {loading ? 'Importing…' : 'Import CSV'}
        </button>
        {result && (
          <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3">
            <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </form>
    </div>
  )
}

// ── GeoJSON Uploader ─────────────────────────────────────────────────────────
function GeoJSONUploader() {
  const [file, setFile]       = useState(null)
  const [projectId, setProj]  = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const fileRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { toast.error('Select a GeoJSON file'); return }
    setLoading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const params = projectId ? { project_id: projectId } : {}
      const { data } = await api.post('/ingest/geojson', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params,
      })
      setResult(data)
      toast.success('GeoJSON imported!')
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'GeoJSON import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-gray-900 mb-4">🗺️ GeoJSON Import</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">Project ID (optional)</label>
          <input className="input-field font-mono text-sm" placeholder="UUID"
            value={projectId} onChange={e => setProj(e.target.value)} />
        </div>
        <div
          className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-brand-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <p className="text-sm text-gray-500">
            {file ? file.name : 'Click to select GeoJSON file'}
          </p>
          <input ref={fileRef} type="file" accept=".geojson,.json" className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <button type="submit" disabled={loading || !file} className="btn-primary w-full">
          {loading ? 'Importing…' : 'Import GeoJSON'}
        </button>
        {result && (
          <div className="bg-green-50 text-green-700 text-sm rounded-lg p-3 overflow-auto max-h-32">
            <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </form>
    </div>
  )
}

// ── EXIF Photo Uploader ───────────────────────────────────────────────────────
function ExifPhotoUploader() {
  const [file, setFile]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const fileRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { toast.error('Select a photo'); return }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post('/ingest/photo-exif', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
      toast.success('Photo EXIF processed! Observation created.')
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'EXIF extraction failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-gray-900 mb-4">📷 Photo EXIF Import</h2>
      <p className="text-xs text-gray-500 mb-3">
        Upload a geotagged photo — GPS EXIF data will auto-create an observation.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div
          className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-brand-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <p className="text-sm text-gray-500">
            {file ? file.name : 'Click to select geotagged photo'}
          </p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <button type="submit" disabled={loading || !file} className="btn-primary w-full">
          {loading ? 'Processing…' : 'Process EXIF'}
        </button>
        {result && (
          <div className="bg-green-50 text-green-700 text-xs rounded-lg p-3">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </form>
    </div>
  )
}

// ── Project Exporter ──────────────────────────────────────────────────────────
function ProjectExporter() {
  const [projectId, setProj] = useState('')
  const [fieldId, setField] = useState('')
  const [projects, setProjects] = useState([])
  const [fieldsList, setFieldsList] = useState([])
  const [loading, setLoading] = useState(false)

  const downloadSummary = async () => {
    if (!projectId) { toast.error('Select a project'); return }
    setLoading(true)
    try {
      const { data: summary } = await api.get(`/export/project/${projectId}/summary`)
      const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `project-${projectId}-summary.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded!')
    } catch (err) {
      toast.error('Export failed')
    } finally {
      setLoading(false)
    }
  }

  const downloadFieldGeoJSON = async () => {
    if (!fieldId) { toast.error('Select a field'); return }
    setLoading(true)
    try {
      const { data } = await api.get(`/export/field/${fieldId}/geojson`)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/geo+json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `field-${fieldId}.geojson`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('GeoJSON downloaded!')
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  // Load projects and watch project selection for fields
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const { data } = await api.get('/projects/', { params: { skip: 0, limit: 200 } })
        if (!mounted) return
        setProjects(data.items ?? [])
      } catch (err) {
        // ignore
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!projectId) { setFieldsList([]); return }
    let mounted = true
    const load = async () => {
      try {
        const { data } = await api.get('/fields/', { params: { project_id: projectId, skip: 0, limit: 500 } })
        if (!mounted) return
        setFieldsList(data.items ?? [])
      } catch (err) { setFieldsList([]) }
    }
    load()
    return () => { mounted = false }
  }, [projectId])

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-gray-900 mb-4">📤 Export</h2>
      <div className="space-y-3">
        <div>
          <label className="label">Project</label>
          <select className="input-field" value={projectId} onChange={e => setProj(e.target.value)}>
            <option value="">Select project…</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={downloadSummary}
          disabled={loading || !projectId}
          className="btn-primary w-full"
        >
          {loading ? 'Exporting…' : '⬇️ Project Summary (JSON)'}
        </button>
        <div>
          <label className="label">Field</label>
          <select className="input-field" value={fieldId} onChange={e => setField(e.target.value)}>
            <option value="">Select field…</option>
            {fieldsList.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Choose a project first to filter fields.</p>
        </div>
        <button
          onClick={downloadFieldGeoJSON}
          disabled={loading || !fieldId}
          className="btn-secondary w-full"
        >
          ⬇️ Field GeoJSON Export
        </button>
      </div>
    </div>
  )
}
