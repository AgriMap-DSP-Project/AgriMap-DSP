import React from 'react'

const MAP = {
  pending:  'badge-pending',
  verified: 'badge-verified',
  rejected: 'badge-rejected',
  // project statuses
  planning:  'badge-pending',
  active:    'badge-verified',
  completed: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800',
  archived:  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800',
}

export default function StatusBadge({ status }) {
  const cls = MAP[status] ?? 'badge-pending'
  return <span className={cls}>{status}</span>
}
