/**
 * AIInsightsPanel — triggers field analysis, shows readiness score,
 * risk warnings, recommendations, and a natural language query box.
 */
import React, { useState } from 'react'
import api from '../../lib/api'
import toast from '../ui/Toast'

export default function AIInsightsPanel({ fieldId, onClose }) {
  const [analysis, setAnalysis]   = useState(null)
  const [recs, setRecs]           = useState(null)
  const [loading, setLoading]     = useState(false)
  const [queryText, setQueryText] = useState('')
  const [queryResult, setQueryResult] = useState(null)
  const [querying, setQuerying]   = useState(false)
  const [tab, setTab]             = useState('analysis')

  const runAnalysis = async () => {
    setLoading(true)
    setAnalysis(null)
    try {
      const [anal, rec] = await Promise.all([
        api.post(`/ai/analyze-field/${fieldId}`),
        api.get(`/ai/recommendations/${fieldId}`),
      ])
      setAnalysis(anal.data)
      setRecs(rec.data.recommendations)
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'AI analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const runQuery = async (e) => {
    e.preventDefault()
    if (!queryText.trim()) return
    setQuerying(true)
    setQueryResult(null)
    try {
      const { data } = await api.post('/ai/query', { question: queryText })
      setQueryResult(data)
    } catch (err) {
      toast.error('Query failed')
    } finally {
      setQuerying(false)
    }
  }

  const score = analysis?.readiness_score ?? analysis?.overall_readiness_score
  const scoreColor = score >= 7 ? 'text-green-600' : score >= 4 ? 'text-yellow-600' : 'text-red-600'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">🤖 AI Insights</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {[['analysis','Analysis'],['query','Query']].map(([k,label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${tab === k ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'analysis' && (
            <div className="space-y-4">
              <button
                onClick={runAnalysis}
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing field…
                  </span>
                ) : 'Run AI Analysis'}
              </button>

              {analysis && (
                <div className="space-y-4">
                  {/* Score */}
                  <div className="card p-4 text-center">
                    <div className="text-xs text-gray-500 mb-1">Readiness Score</div>
                    <div className={`text-5xl font-bold ${scoreColor}`}>
                      {score ?? '?'}<span className="text-2xl text-gray-400">/10</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 capitalize">
                      {analysis.analysis_type ?? ''}
                    </div>
                  </div>

                  {/* Risk assessment */}
                  {analysis.risk_assessment && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Risk Assessment</h3>
                      <div className="space-y-2">
                        {Object.entries(analysis.risk_assessment).map(([risk, level]) => (
                          <div key={risk} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 capitalize">{risk.replace(/_/g, ' ')}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              level === 'low' ? 'bg-green-100 text-green-700' :
                              level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {level}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key findings */}
                  {analysis.key_findings?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Key Findings</h3>
                      <ul className="space-y-1.5">
                        {analysis.key_findings.map((f, i) => (
                          <li key={i} className="text-sm text-gray-700 flex gap-2">
                            <span className="text-brand-500 flex-shrink-0">•</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {(recs?.length > 0 || analysis.recommendations?.length > 0) && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Recommendations</h3>
                      <ul className="space-y-1.5">
                        {(recs ?? analysis.recommendations ?? []).map((r, i) => (
                          <li key={i} className="text-sm bg-brand-50 text-brand-800 p-2 rounded-lg">
                            {typeof r === 'string' ? r : r.text ?? JSON.stringify(r)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'query' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Ask natural language questions about your field data using AI-powered search.
              </p>
              <form onSubmit={runQuery} className="space-y-3">
                <textarea
                  rows={3}
                  className="input-field resize-none"
                  placeholder="e.g. Which fields have water sources? What pest issues have been reported?"
                  value={queryText}
                  onChange={e => setQueryText(e.target.value)}
                />
                <button type="submit" disabled={querying || !queryText.trim()} className="btn-primary w-full">
                  {querying ? 'Searching…' : 'Ask AI'}
                </button>
              </form>

              {queryResult && (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Answer</div>
                    <p className="text-sm text-gray-800">
                      {queryResult.answer ?? queryResult.response ?? JSON.stringify(queryResult)}
                    </p>
                  </div>
                  {queryResult.sources?.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Sources</div>
                      <ul className="space-y-1">
                        {queryResult.sources.map((s, i) => (
                          <li key={i} className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                            {typeof s === 'string' ? s : JSON.stringify(s)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
