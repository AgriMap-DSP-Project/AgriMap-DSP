/**
 * VerificationDrawer — side panel for verifier/admin role.
 * Handles PATCH /{resource}/{id}/verify for fields, zones, resources,
 * reference_points, and observations.
 *
 * Verification payload uses `verification_status` + `verification_notes`
 * (confirmed from backend FieldVerificationUpdate schema).
 */
import React, { useState } from 'react'
import api from '../../lib/api'
import toast from '../ui/Toast'

const ENDPOINT_MAP = {
  fields:           'fields',
  zones:            'zones',
  resources:        'resources',
  reference_points: 'reference-points',
  observations:     'observations',
}

export default function VerificationDrawer({ resourceType, item, onClose, onVerified }) {
  const [notes, setNotes]     = useState('')
  const [loading, setLoading] = useState(false)

  const endpoint = ENDPOINT_MAP[resourceType] ?? resourceType

  const submit = async (status) => {
    setLoading(true)
    try {
      await api.patch(`/${endpoint}/${item.id}/verify`, {
        verification_status: status,
        verification_notes: notes || undefined,
      })
      toast.success(`${status === 'verified' ? '✅ Verified' : '❌ Rejected'}: ${item.name ?? item.category ?? item.id}`)
      onVerified()
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Verification</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Item</div>
            <div className="font-medium text-gray-900">{item.name ?? item.category ?? '—'}</div>
            <div className="text-sm text-gray-500">
              Type: <span className="font-medium">{resourceType}</span>
            </div>
            <div className="text-sm text-gray-500">
              Current status:{' '}
              <span className={`font-medium ${
                item.verification_status === 'verified' ? 'text-green-600' :
                item.verification_status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {item.verification_status}
              </span>
            </div>
            {item.boundary && (
              <div className="text-xs text-gray-400 font-mono mt-1 truncate">
                Geom: {JSON.stringify(item.boundary).slice(0, 80)}…
              </div>
            )}
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              rows={4}
              className="input-field resize-none"
              placeholder="Add verification notes…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => submit('rejected')}
            disabled={loading}
            className="btn-danger flex-1"
          >
            {loading ? '…' : '✗ Reject'}
          </button>
          <button
            onClick={() => submit('verified')}
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? '…' : '✓ Verify'}
          </button>
        </div>
      </div>
    </>
  )
}
