/**
 * Simple toast notification system.
 * Usage: import { toast } from './Toast'; toast.success('Saved!')
 */
import React, { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'

let _addToast = null

function ToastContainer() {
  const [toasts, setToasts] = useState([])

  const add = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  useEffect(() => {
    _addToast = add
    return () => { _addToast = null }
  }, [add])

  const colors = {
    success: 'bg-green-600',
    error:   'bg-red-600',
    info:    'bg-blue-600',
    warning: 'bg-yellow-500',
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg text-white text-sm shadow-lg max-w-sm animate-slide-up ${colors[t.type] ?? colors.info}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}

// Mount once into a portal div
if (typeof document !== 'undefined') {
  const el = document.createElement('div')
  document.body.appendChild(el)
  createRoot(el).render(<ToastContainer />)
}

export const toast = {
  success: (msg) => _addToast?.(msg, 'success'),
  error:   (msg) => _addToast?.(msg, 'error'),
  info:    (msg) => _addToast?.(msg, 'info'),
  warning: (msg) => _addToast?.(msg, 'warning'),
}

export default toast
