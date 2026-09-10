import React from 'react'

/**
 * Reusable pagination component.
 * Props: total, skip, limit, onPageChange(newSkip)
 */
export default function Pagination({ total, skip, limit, onPageChange }) {
  const totalPages = Math.ceil(total / limit)
  const currentPage = Math.floor(skip / limit) + 1

  if (totalPages <= 1) return null

  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
    if (totalPages <= 7) return i + 1
    if (currentPage <= 4) return i + 1
    if (currentPage >= totalPages - 3) return totalPages - 6 + i
    return currentPage - 3 + i
  })

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-gray-500">
        Showing {skip + 1}–{Math.min(skip + limit, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(skip - limit)}
          className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ‹
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange((p - 1) * limit)}
            className={`px-3 py-1 text-sm rounded transition-colors
              ${p === currentPage
                ? 'bg-brand-600 text-white'
                : 'hover:bg-gray-100 text-gray-700'}`}
          >
            {p}
          </button>
        ))}
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(skip + limit)}
          className="px-2 py-1 text-sm rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>
    </div>
  )
}
