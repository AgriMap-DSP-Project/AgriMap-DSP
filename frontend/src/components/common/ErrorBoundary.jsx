import React from 'react'
import farmStorage from '../../lib/farmStorage'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught an unhandled error]:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleResetStorage = () => {
    try {
      farmStorage.resetAll()
      localStorage.clear()
    } catch (e) {
      console.warn('Failed to clear storage:', e)
    }
    window.location.href = '/'
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-v2v-softwhite flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 border border-v2v-lavendergray shadow-2xl text-center space-y-5 animate-slide-up">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-v2v-deep border border-v2v-lavender/30 flex items-center justify-center text-3xl mx-auto shadow-inner">
              🌾
            </div>

            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-v2v-secondary bg-purple-50 px-3 py-1 rounded-full border border-v2v-lavender/30">
                AgriMap Spatial Recovery
              </span>
              <h1 className="text-2xl font-black text-v2v-deep mt-3">
                Something encountered an unexpected error
              </h1>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                The map or component encountered an unexpected rendering issue. You can reload the page or reset the local demo farm data.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-left overflow-auto max-h-32 text-[11px] font-mono text-rose-600">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 btn-v2v-gradient text-xs py-3 px-4 rounded-xl shadow-md font-bold"
              >
                🔄 Reload Page
              </button>
              <button
                onClick={this.handleResetStorage}
                className="flex-1 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs py-3 px-4 rounded-xl font-bold transition-colors"
                title="Restores clean sample farmers, fields and devices"
              >
                🧹 Reset Data & Go Home
              </button>
            </div>

            <div className="pt-2">
              <a
                href="/"
                className="text-xs text-gray-500 hover:text-v2v-deep transition-colors"
              >
                ← Return to Landing Page
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
