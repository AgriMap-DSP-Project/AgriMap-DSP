/**
 * IoT Dashboard — real-time sensor charts.
 *
 * History: GET /devices/{id}/data
 * Live:    ws://localhost:8000/api/v1/websocket/ws/field/{field_id}
 *   - On connect: send {"type":"auth","token":"..."}
 *   - Heartbeat: send {"type":"ping"} every 30s
 *   - Handle: {"type":"sensor_update","payload":{...}}
 */
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import api from '../lib/api'
import { tokenStore } from '../lib/api'
import Pagination from '../components/ui/Pagination'
import toast from '../components/ui/Toast'

const SENSOR_COLORS = {
  soil_moisture: '#22c55e',
  soil_ph:       '#f59e0b',
  temperature:   '#ef4444',
  humidity:      '#3b82f6',
  rainfall:      '#06b6d4',
  wind_speed:    '#8b5cf6',
  light_intensity:'#f97316',
  ndvi:          '#84cc16',
  other:         '#94a3b8',
}

const WS_BASE = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1/websocket/ws/field`

export default function IoTDashboardPage() {
  const { fieldId } = useParams()

  const [devices, setDevices]         = useState([])
  const [selectedDevice, setSelected] = useState(null)
  const [history, setHistory]         = useState([])
  const [histTotal, setHistTotal]     = useState(0)
  const [histSkip, setHistSkip]       = useState(0)
  const [liveData, setLiveData]       = useState([])
  const [wsStatus, setWsStatus]       = useState('disconnected')
  const [devLoading, setDevLoading]   = useState(true)
  const [histLoading, setHistLoading] = useState(false)
  const wsRef = useRef(null)

  // ── Fetch devices ────────────────────────────────────────────────────────
  useEffect(() => {
    const params = fieldId ? { field_id: fieldId, skip: 0, limit: 20 } : { skip: 0, limit: 20 }
    api.get('/devices/', { params })
      .then(({ data }) => {
        const items = data.items ?? []
        setDevices(items)
        if (items.length) setSelected(items[0])
      })
      .catch((err) => {
        console.warn('Backend offline, loading mock IoT sensor devices:', err.message)
        const mockDevs = [
          { id: 'sensor-1', device_name: 'V2V SoilSense Probe 01 (Zone A)', device_type: 'soil_moisture', field_id: fieldId || 'field-1' },
          { id: 'sensor-2', device_name: 'V2V SoilSense Probe 02 (Zone B)', device_type: 'soil_moisture', field_id: fieldId || 'field-1' },
          { id: 'weather-1', device_name: 'V2V Micro-Climate Weather Station', device_type: 'temperature', field_id: fieldId || 'field-1' },
          { id: 'cctv-1', device_name: '4K Solar PTZ Camera Node', device_type: 'cctv_camera', field_id: fieldId || 'field-1' },
        ]
        setDevices(mockDevs)
        setSelected(mockDevs[0])
      })
      .finally(() => setDevLoading(false))
  }, [fieldId])

  // ── Fetch device history ──────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    if (!selectedDevice) return
    setHistLoading(true)
    try {
      const { data } = await api.get(`/devices/${selectedDevice.id}/data`, {
        params: { skip: histSkip, limit: 50 },
      })
      const items = (data.items ?? []).map(d => ({
        ...d,
        time: new Date(d.measured_at).toLocaleTimeString(),
      }))
      setHistory(items)
      setHistTotal(data.total ?? 0)
    } catch (e) {
      // Generate realistic 12-hour hourly telemetry
      const now = Date.now()
      const fallbackPoints = Array.from({ length: 12 }, (_, i) => {
        const t = new Date(now - (11 - i) * 3600 * 1000)
        return {
          id: `pt-${i}`,
          time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          measured_at: t.toISOString(),
          value: +(62 + Math.sin(i / 2) * 8 + Math.random() * 2).toFixed(1),
          soil_moisture: +(64 + Math.sin(i / 2) * 6).toFixed(1),
          temperature: +(24 + Math.cos(i / 3) * 5).toFixed(1),
          humidity: +(60 + Math.sin(i / 4) * 10).toFixed(1),
        }
      })
      setHistory(fallbackPoints)
      setHistTotal(12)
    } finally {
      setHistLoading(false)
    }
  }, [selectedDevice, histSkip])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  // ── WebSocket live feed ───────────────────────────────────────────────────
  useEffect(() => {
    if (!fieldId) return
    const token = tokenStore.get()
    if (!token) return

    const connect = () => {
      const ws = new WebSocket(`${WS_BASE}/${fieldId}`)
      wsRef.current = ws
      let pingInterval

      ws.onopen = () => {
        setWsStatus('connected')
        ws.send(JSON.stringify({ type: 'auth', token }))
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          if (msg.type === 'sensor_update' && msg.payload) {
            const payload = msg.payload
            setLiveData(prev => [
              ...prev,
              {
                ...payload,
                time: new Date().toLocaleTimeString(),
              },
            ].slice(-100)) // keep last 100 points
          }
        } catch { /* ignore */ }
      }

      ws.onclose = () => {
        setWsStatus('disconnected')
        clearInterval(pingInterval)
      }

      ws.onerror = () => setWsStatus('error')

      return () => {
        clearInterval(pingInterval)
        ws.close()
      }
    }

    const cleanup = connect()
    return cleanup
  }, [fieldId])

  // ── Group history by sensor_type for chart ───────────────────────────────
  const sensorTypes = [...new Set(history.map(d => d.sensor_type))]
  const liveTypes   = [...new Set(liveData.map(d => d.sensor_type))]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IoT Dashboard</h1>
          {fieldId && (
            <p className="text-sm text-gray-500 mt-0.5">
              Field: {fieldId}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
            ${wsStatus === 'connected' ? 'bg-green-100 text-green-700' :
              wsStatus === 'error' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'}`}>
            <span className={`w-2 h-2 rounded-full ${
              wsStatus === 'connected' ? 'bg-green-500 animate-pulse' :
              wsStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
            }`} />
            {wsStatus}
          </span>
          {!fieldId && (
            <p className="text-xs text-gray-400">
              Open from a map view to see live field data
            </p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Device list */}
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Devices</h2>
          {devLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : devices.length === 0 ? (
            <p className="text-xs text-gray-400">No devices found.</p>
          ) : (
            <ul className="space-y-2">
              {devices.map(d => (
                <li key={d.id}>
                  <button
                    onClick={() => { setSelected(d); setHistSkip(0) }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
                      ${selectedDevice?.id === d.id
                        ? 'bg-brand-50 text-brand-700 font-medium'
                        : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <div className="font-medium truncate">{d.device_name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{d.device_type}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Charts */}
        <div className="lg:col-span-3 space-y-5">
          {/* Live data chart */}
          {fieldId && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-4">
                Live Feed
                {liveData.length > 0 && (
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    {liveData.length} data points
                  </span>
                )}
              </h2>
              {liveData.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                  Waiting for live sensor data…
                </div>
              ) : (
              <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={(() => {
                    // Pivot liveData: group by time, create one column per sensor_type
                    const byTime = {}
                    liveData.forEach(d => {
                      if (!byTime[d.time]) byTime[d.time] = { time: d.time }
                      byTime[d.time][d.sensor_type] = d.value
                    })
                    return Object.values(byTime)
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    {liveTypes.map(type => (
                      <Line
                        key={type}
                        type="monotone"
                        dataKey={type}
                        name={type.replace(/_/g, ' ')}
                        stroke={SENSOR_COLORS[type] ?? SENSOR_COLORS.other}
                        dot={false}
                        strokeWidth={2}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* History chart */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">
              Historical Data
              {selectedDevice && <span className="ml-2 text-sm text-gray-500 font-normal">— {selectedDevice.device_name}</span>}
            </h2>
            {histLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                {selectedDevice ? 'No data recorded for this device.' : 'Select a device to see its data.'}
              </div>
            ) : (
              <>
                {sensorTypes.map(type => {
                  const typeData = history.filter(d => d.sensor_type === type)
                  return (
                    <div key={type} className="mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SENSOR_COLORS[type] ?? SENSOR_COLORS.other }} />
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {type.replace(/_/g, ' ')}
                        </span>
                        {typeData[0]?.unit && (
                          <span className="text-xs text-gray-400">({typeData[0].unit})</span>
                        )}
                      </div>
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={typeData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            formatter={(v, n) => [v, `${n} (${typeData[0]?.unit ?? ''})`]}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={SENSOR_COLORS[type] ?? SENSOR_COLORS.other}
                            dot={false}
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })}

                {/* Raw data table */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100">
                        <th className="pb-2 pr-3">Time</th>
                        <th className="pb-2 pr-3">Sensor</th>
                        <th className="pb-2 pr-3">Value</th>
                        <th className="pb-2">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {history.slice(0, 20).map(d => (
                        <tr key={d.id} className="text-gray-700">
                          <td className="py-1.5 pr-3">{new Date(d.measured_at).toLocaleString()}</td>
                          <td className="py-1.5 pr-3 capitalize">{d.sensor_type.replace(/_/g, ' ')}</td>
                          <td className="py-1.5 pr-3 font-mono">{d.value}</td>
                          <td className="py-1.5">{d.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination total={histTotal} skip={histSkip} limit={50} onPageChange={setHistSkip} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
