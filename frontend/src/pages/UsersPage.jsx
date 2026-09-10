/**
 * UsersPage — admin-only user management.
 */
import React, { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'
import Pagination from '../components/ui/Pagination'
import Modal from '../components/ui/Modal'
import toast from '../components/ui/Toast'

export default function UsersPage() {
  const [users, setUsers]   = useState([])
  const [total, setTotal]   = useState(0)
  const [skip, setSkip]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [editUser, setEdit]   = useState(null)
  const [showCreate, setCreate] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users/', { params: { skip, limit: 20 } })
      setUsers(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [skip])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const deactivate = async (id) => {
    if (!confirm('Deactivate this user?')) return
    try {
      await api.put(`/users/${id}`, { is_active: false })
      toast.success('User deactivated')
      fetchUsers()
    } catch {
      toast.error('Failed to deactivate')
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button onClick={() => setCreate(true)} className="btn-primary">+ New user</button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Active</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{u.full_name}</td>
                  <td className="px-5 py-3 text-gray-600">{u.email}</td>
                  <td className="px-5 py-3 capitalize">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'verifier' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs ${u.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                      {u.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 flex gap-3">
                    <button onClick={() => setEdit(u)}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                      Edit
                    </button>
                    {u.is_active && (
                      <button onClick={() => deactivate(u.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium">
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
        <div className="px-5 pb-4">
          <Pagination total={total} skip={skip} limit={20} onPageChange={setSkip} />
        </div>
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setCreate(false)}
          onCreated={() => { setCreate(false); fetchUsers() }}
        />
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); fetchUsers() }}
        />
      )}
    </div>
  )
}

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    email: '', full_name: '', password: '', role: 'farmer', is_active: true,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      toast.success('User created!')
      onCreated()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Create User">
      {error && <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Full name *</label>
          <input required className="input-field" value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Email *</label>
          <input required type="email" className="input-field" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="label">Password *</label>
          <input required type="password" minLength={8} className="input-field" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        </div>
        <div>
          <label className="label">Role *</label>
          <select className="input-field" value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="farmer">Farmer</option>
            <option value="verifier">Verifier</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    full_name: user.full_name,
    role: user.role,
    is_active: user.is_active,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.put(`/users/${user.id}`, form)
      toast.success('User updated!')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Edit User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Full name</label>
          <input className="input-field" value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input-field" value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="farmer">Farmer</option>
            <option value="verifier">Verifier</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="is_active" checked={form.is_active}
            onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
