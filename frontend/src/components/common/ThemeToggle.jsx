import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'

export default function ThemeToggle({ variant = 'default', className = '' }) {
  const { theme, toggleTheme, isDark } = useTheme()

  if (variant === 'pill') {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border shadow-sm ${
          isDark
            ? 'bg-slate-800 text-yellow-400 border-slate-700 hover:bg-slate-700 hover:border-yellow-400/40'
            : 'bg-white text-slate-700 border-gray-200 hover:bg-slate-50 hover:text-v2v-deep'
        } ${className}`}
      >
        <span className="text-sm">{isDark ? '🌙' : '☀️'}</span>
        <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
      </button>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      aria-label="Toggle Theme"
      className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center border ${
        isDark
          ? 'bg-slate-800 text-yellow-300 border-slate-700 hover:bg-slate-700 hover:border-yellow-400/50 shadow-md shadow-black/20'
          : 'bg-white text-v2v-deep border-v2v-border hover:bg-v2v-softwhite hover:border-v2v-purple shadow-sm'
      } ${className}`}
    >
      {isDark ? (
        <span className="flex items-center gap-1.5 text-xs font-bold text-yellow-300">
          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
          <span className="hidden sm:inline">Dark</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs font-bold text-v2v-deep">
          <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">Light</span>
        </span>
      )}
    </button>
  )
}
