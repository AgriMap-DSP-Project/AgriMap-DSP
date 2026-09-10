import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import V2VLogo from '../components/common/V2VLogo'
import { useAuth } from '../contexts/AuthContext'

export default function LandingPage() {
  const { user, loginDemo, logout } = useAuth()
  const navigate = useNavigate()

  const handleLaunchRole = (role) => {
    loginDemo(role)
    if (role === 'farmer') {
      navigate('/farmer')
    } else if (role === 'admin' || role === 'verifier') {
      navigate('/admin/farmers')
    } else {
      navigate('/dashboard')
    }
  }

  const handleOpenAdminEditor = (fieldId = 'field-1') => {
    loginDemo('admin')
    navigate(`/admin/editor/${fieldId}`)
  }

  const handleOpenFarmerMap = (farmerId = 'farmer-1') => {
    loginDemo('farmer')
    navigate(`/farmer?farmerId=${farmerId}`)
  }

  const handleOpenAdminFarmers = () => {
    loginDemo('admin')
    navigate('/admin/farmers')
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col selection:bg-v2v-lavender selection:text-white">
      {/* ── Top Header / Navbar ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-v2v-lavendergray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <V2VLogo size="md" />
            <span className="hidden sm:inline-block px-2.5 py-0.5 text-xs font-semibold text-v2v-deep bg-v2v-softwhite border border-v2v-lavendergray rounded-full">
              AgriMap DSP
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#pillars" className="hover:text-v2v-deep transition-colors">Core Pillars</a>
            <a href="#farmer-experience" className="hover:text-v2v-deep transition-colors">Farmer Experience</a>
            <a href="#admin-portal" className="hover:text-v2v-deep transition-colors">Admin Controls</a>
            <a href="#blueprint" className="hover:text-v2v-deep transition-colors">System Blueprint</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 hidden sm:inline">
                  Logged in as <strong className="text-v2v-deep">{user.full_name}</strong>
                </span>
                <button
                  onClick={() => handleLaunchRole(user.role || 'farmer')}
                  className="btn-v2v-gradient text-xs py-2 px-3.5"
                >
                  Go to App →
                </button>
                <button
                  onClick={logout}
                  className="text-xs text-gray-500 hover:text-rose-600 px-2 py-1"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-v2v-deep hover:text-v2v-secondary px-3 py-2"
                >
                  Sign In
                </Link>
                <button
                  onClick={() => handleLaunchRole('farmer')}
                  className="btn-v2v-gradient text-xs sm:text-sm"
                >
                  Explore Demo →
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-v2v-softwhite py-20 lg:py-28 border-b border-v2v-lavendergray">
        {/* V2V Brand Watermark Graphic */}
        <div 
          className="absolute inset-0 bg-no-repeat bg-right-top bg-contain opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: "url('/images/v2v-watermark.png')" }}
        />
        {/* Glow effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-v2v-lavender/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-v2v-electric/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-v2v-lavendergray shadow-sm text-xs font-semibold text-v2v-deep mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>V2V Agrilythos (AGX) · Smart Agriculture Pre-Assessment</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-v2v-deep tracking-tight leading-[1.15] mb-6">
              Digital Land Twin & <br />
              <span className="bg-gradient-to-r from-v2v-deep via-v2v-secondary to-v2v-lavender bg-clip-text text-transparent">
                Precision Farm Intelligence
              </span>
            </h1>

            {/* Subhead */}
            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-10 max-w-2xl mx-auto font-normal">
              Capture sub-meter GPS boundaries, monitor live borewells & water pump runtimes, track autonomous CCTV camera feeds, and empower farmers with interactive spatial twins.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => handleLaunchRole('farmer')}
                className="btn-v2v-gradient text-base px-7 py-3.5 flex items-center gap-2.5 rounded-xl shadow-lg shadow-v2v-lavender/30 hover:scale-[1.02] transition-transform"
              >
                <span>🧑‍🌾</span>
                <span>Launch Farmer Portal Demo</span>
              </button>
              <button
                onClick={() => handleLaunchRole('admin')}
                className="btn-secondary text-base px-7 py-3.5 flex items-center gap-2.5 rounded-xl bg-white hover:bg-v2v-softwhite text-v2v-deep font-semibold shadow-sm hover:border-v2v-lavender transition-all"
              >
                <span>⚙️</span>
                <span>Admin Management Platform</span>
              </button>
            </div>

            {/* Quick switcher note */}
            <p className="text-xs text-gray-400 mt-4">
              ✨ Instant one-click demo access with pre-seeded real Indian farmland data (Pollachi, Karad, Thanjavur & Anand).
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto mt-16">
            <div className="bg-white p-5 rounded-2xl border border-v2v-lavendergray shadow-sm text-center">
              <div className="text-3xl font-extrabold text-v2v-deep">18,500+</div>
              <div className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">Acres Mapped</div>
              <div className="text-[11px] text-v2v-lavender font-semibold mt-1">Sub-meter GPS MultiPolygons</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-v2v-lavendergray shadow-sm text-center">
              <div className="text-3xl font-extrabold text-v2v-deep">99.4%</div>
              <div className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">Pump Telemetry Uptime</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">Daily Runtime & Flow Logs</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-v2v-lavendergray shadow-sm text-center">
              <div className="text-3xl font-extrabold text-v2v-deep">1,420+</div>
              <div className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">CCTV & IoT Nodes</div>
              <div className="text-[11px] text-v2v-lavender font-semibold mt-1">Solar PTZ & Multi-Depth Probes</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-v2v-lavendergray shadow-sm text-center">
              <div className="text-3xl font-extrabold text-v2v-deep">9.2 / 10</div>
              <div className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">AI Farm Readiness</div>
              <div className="text-[11px] text-v2v-secondary font-semibold mt-1">Automated Risk Scoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 Core Pillars Section ── */}
      <section id="pillars" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-v2v-lavender">Engineered for Precision</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-v2v-deep mt-2">
              The 4 Pillars of V2V AgriMap DSP
            </h2>
            <p className="text-gray-600 text-sm sm:text-base mt-3">
              Before deploying precision agriculture hardware, field teams survey, digitize, and monitor every asset on the land.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="card-hover p-6 rounded-2xl border border-v2v-lavendergray bg-white relative flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-v2v-deep text-white flex items-center justify-center text-xl shadow-md shadow-v2v-deep/20 mb-5">
                  🗺️
                </div>
                <h3 className="text-lg font-bold text-v2v-deep mb-2">Exact Land Boundary Mapping</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Field surveyors capture exact GPS polygon borders, Khata/Patta numbers, and subdivide plots into distinct crop zones with automated area calculation.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-v2v-lavendergray text-xs font-semibold text-v2v-secondary flex items-center gap-1">
                <span>MultiPolygon WGS 84</span>
                <span>→</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="card-hover p-6 rounded-2xl border border-v2v-lavendergray bg-white relative flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-v2v-electric text-white flex items-center justify-center text-xl shadow-md shadow-v2v-electric/20 mb-5">
                  💧
                </div>
                <h3 className="text-lg font-bold text-v2v-deep mb-2">Borewell & Water Intelligence</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Real-time tracking of water table depth, flow rate (L/min), and exact runtimes (e.g. "Ran 4.2 hrs yesterday, pumped 34,020 L") with remote pump controls.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-v2v-lavendergray text-xs font-semibold text-v2v-secondary flex items-center gap-1">
                <span>Daily Logs & Pressure Valves</span>
                <span>→</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="card-hover p-6 rounded-2xl border border-v2v-lavendergray bg-white relative flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-v2v-secondary text-white flex items-center justify-center text-xl shadow-md shadow-v2v-secondary/20 mb-5">
                  📹
                </div>
                <h3 className="text-lg font-bold text-v2v-deep mb-2">Autonomous CCTV Surveillance</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Solar-powered 4K PTZ cameras with 120° coverage cones, day/night infrared motion detection, live feed preview, and perimeter breach alerts.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-v2v-lavendergray text-xs font-semibold text-v2v-secondary flex items-center gap-1">
                <span>4K UltraHD + Solar Battery</span>
                <span>→</span>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="card-hover p-6 rounded-2xl border border-v2v-lavendergray bg-white relative flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-v2v-lavender text-white flex items-center justify-center text-xl shadow-md shadow-v2v-lavender/20 mb-5">
                  🧠
                </div>
                <h3 className="text-lg font-bold text-v2v-deep mb-2">IoT Telemetry & AI Scoring</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Multi-depth soil moisture sensors (15cm & 45cm), NPK monitoring, weather station telemetry, and automated 1-10 farm readiness risk scoring.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-v2v-lavendergray text-xs font-semibold text-v2v-secondary flex items-center gap-1">
                <span>FAISS RAG & GPT-4o Engine</span>
                <span>→</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Farmer Experience Showcase ── */}
      <section id="farmer-experience" className="py-20 bg-v2v-softwhite border-y border-v2v-lavendergray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-v2v-deep text-xs font-bold">
                <span>🧑‍🌾</span>
                <span>Dedicated Farmer Experience</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-v2v-deep tracking-tight">
                An Off-Screen Interactive Map of Your Complete Farmland
              </h2>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                When a farmer logs in, they immediately see an interactive satellite map showing the exact drawn shape of their land. Inside the borders, every asset is marked and clickable:
              </p>

              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Borewells & Pumps:</strong> Click to view yesterday's runtime hours, flow rate in L/min, and toggle the smart motor switch.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>CCTV Cameras:</strong> Click to open live camera feeds, check battery levels, and view motion detection timestamps.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Crops, Plants & Trees:</strong> View exact crop boundaries (Mango, Cotton, Sugarcane), tree counts, and soil moisture levels.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Pipelines & Power:</strong> Trace mainline and drip irrigation pipelines, 3-phase grid status, and solar inverter output.</span>
                </li>
              </ul>

              <div className="pt-2">
                <button
                  onClick={() => handleOpenFarmerMap('farmer-1')}
                  className="btn-v2v-gradient px-6 py-3 text-sm font-semibold rounded-xl flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span>Open Ganesh V.'s Farm Map (21.4 Acres)</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Right Interactive Card Preview */}
            <div className="lg:col-span-6">
              <div className="bg-white rounded-2xl border border-v2v-lavendergray shadow-xl overflow-hidden">
                {/* Mock Card Top Header */}
                <div className="bg-v2v-deep text-white px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🌾</span>
                    <div>
                      <div className="font-bold text-sm">Ganesh V.'s Smart Farmland</div>
                      <div className="text-[11px] text-v2v-lavendergray">Pollachi, Tamil Nadu · 21.4 Acres (8.66 Ha)</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
                    3-Phase Active
                  </span>
                </div>

                {/* Simulated Map Graphic */}
                <div className="relative h-64 bg-slate-800 flex items-center justify-center p-4 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-60"
                    style={{
                      backgroundImage: "url('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/16/28000/44200')"
                    }}
                  />
                  {/* Overlay Polygon */}
                  <div className="absolute inset-8 border-2 border-v2v-lavender rounded-xl bg-v2v-deep/30 backdrop-blur-[1px] flex flex-col justify-between p-3">
                    <div className="flex justify-between items-start">
                      <span className="bg-v2v-deep/90 text-white text-[10px] font-mono px-2 py-1 rounded">
                        Khata #TN-POL-4820
                      </span>
                      <span className="bg-emerald-600 text-white text-[10px] font-mono px-2 py-1 rounded flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        Borewell #1 Active
                      </span>
                    </div>

                    {/* Interactive Pop-up Mock */}
                    <div className="bg-white/95 text-gray-900 rounded-lg p-2.5 shadow-lg border border-v2v-lavendergray text-xs space-y-1">
                      <div className="font-bold text-v2v-deep flex items-center justify-between">
                        <span>💧 Solar Borewell #1</span>
                        <span className="text-[10px] text-emerald-600 font-semibold">ONLINE</span>
                      </div>
                      <div className="text-[11px] text-gray-600">
                        Yesterday's Runtime: <strong>4.5 hrs</strong> · Pumped: <strong>40,500 Liters</strong>
                      </div>
                      <div className="text-[10px] text-gray-500">
                        Flow Rate: 150 L/min · Depth: 450 ft · 10 HP Solar VFD
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Stats Footer */}
                <div className="p-4 bg-v2v-softwhite border-t border-v2v-lavendergray grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="text-gray-500 text-[10px]">Crops Cultivated</div>
                    <div className="font-bold text-v2v-deep">Coconut · Cocoa · Cane</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-[10px]">Sensors Online</div>
                    <div className="font-bold text-emerald-700">4 Probes Active</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-[10px]">Surveillance</div>
                    <div className="font-bold text-v2v-secondary">2 CCTVs Recording</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Admin Portal Showcase ── */}
      <section id="admin-portal" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Mock Table */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="bg-white rounded-2xl border border-v2v-lavendergray shadow-lg overflow-hidden">
                <div className="px-5 py-4 bg-v2v-softwhite border-b border-v2v-lavendergray flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-v2v-deep">Admin Farmers Directory</h4>
                    <p className="text-[11px] text-gray-500">Manage registered farmers, fields & hardware</p>
                  </div>
                  <button
                    onClick={handleOpenAdminFarmers}
                    className="btn-primary text-xs py-1 px-2.5 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                  >
                    + Create Farmer
                  </button>
                </div>
                <div className="divide-y divide-gray-100 text-xs">
                  <div 
                    onClick={() => handleOpenAdminEditor('field-1')}
                    className="p-3.5 flex items-center justify-between hover:bg-v2v-softwhite cursor-pointer transition-colors group"
                    title="Click to edit Ganesh V.'s boundary & devices"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 group-hover:text-v2v-deep flex items-center gap-1">
                        <span>Ganesh V.</span>
                        <span className="text-xs text-v2v-secondary group-hover:translate-x-0.5 transition-transform">→</span>
                      </div>
                      <div className="text-[11px] text-gray-500">Pollachi, Tamil Nadu · 21.4 Acres</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-v2v-deep">3 Borewells · 2 CCTVs</span>
                      <span className="text-v2v-secondary font-semibold group-hover:underline">Edit →</span>
                    </div>
                  </div>
                  <div 
                    onClick={() => handleOpenAdminEditor('field-2')}
                    className="p-3.5 flex items-center justify-between hover:bg-v2v-softwhite cursor-pointer transition-colors group"
                    title="Click to edit Kishore S.'s boundary & devices"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 group-hover:text-v2v-deep flex items-center gap-1">
                        <span>Kishore S.</span>
                        <span className="text-xs text-v2v-secondary group-hover:translate-x-0.5 transition-transform">→</span>
                      </div>
                      <div className="text-[11px] text-gray-500">Karad, Maharashtra · 16.8 Acres</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-v2v-deep">2 Borewells · 2 CCTVs</span>
                      <span className="text-v2v-secondary font-semibold group-hover:underline">Edit →</span>
                    </div>
                  </div>
                  <div 
                    onClick={() => handleOpenAdminEditor('field-3')}
                    className="p-3.5 flex items-center justify-between hover:bg-v2v-softwhite cursor-pointer transition-colors group"
                    title="Click to edit Vignesh R.'s boundary & devices"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 group-hover:text-v2v-deep flex items-center gap-1">
                        <span>Vignesh R.</span>
                        <span className="text-xs text-v2v-secondary group-hover:translate-x-0.5 transition-transform">→</span>
                      </div>
                      <div className="text-[11px] text-gray-500">Thanjavur, Tamil Nadu · 26.5 Acres</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-v2v-deep">3 Borewells · 3 CCTVs</span>
                      <span className="text-v2v-secondary font-semibold group-hover:underline">Edit →</span>
                    </div>
                  </div>
                  <div 
                    onClick={() => handleOpenAdminEditor('field-4')}
                    className="p-3.5 flex items-center justify-between hover:bg-v2v-softwhite cursor-pointer transition-colors group"
                    title="Click to edit Ravi Kumar's boundary & devices"
                  >
                    <div>
                      <div className="font-semibold text-gray-900 group-hover:text-v2v-deep flex items-center gap-1">
                        <span>Ravi Kumar</span>
                        <span className="text-xs text-v2v-secondary group-hover:translate-x-0.5 transition-transform">→</span>
                      </div>
                      <div className="text-[11px] text-gray-500">Anand, Gujarat · 18.5 Acres</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-v2v-deep">2 Borewells · 2 CCTVs</span>
                      <span className="text-v2v-secondary font-semibold group-hover:underline">Edit →</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content */}
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-v2v-dark text-white text-xs font-bold">
                <span>⚙️</span>
                <span>Enterprise Admin Portal</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-v2v-deep tracking-tight">
                Complete Control Over Farmers, Boundaries & Devices
              </h2>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                Admins have full operational access to manage farmers across all regions. You can create farmers, correct GPS boundary shapes, and add or update hardware on the land:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-700">
                <div className="p-4 rounded-xl bg-v2v-softwhite border border-v2v-lavendergray">
                  <div className="font-bold text-v2v-deep text-sm mb-1">Create & Edit Farmers</div>
                  <p className="text-gray-600">Register new farmers, assign survey khata numbers, update land area, or remove accounts.</p>
                </div>
                <div className="p-4 rounded-xl bg-v2v-softwhite border border-v2v-lavendergray">
                  <div className="font-bold text-v2v-deep text-sm mb-1">Correct Land Boundaries</div>
                  <p className="text-gray-600">Adjust polygon vertices on satellite maps and instantly recalculate acreage & hectares.</p>
                </div>
                <div className="p-4 rounded-xl bg-v2v-softwhite border border-v2v-lavendergray">
                  <div className="font-bold text-v2v-deep text-sm mb-1">Device & Pump Placement</div>
                  <p className="text-gray-600">Add borewells, solar pumps, CCTV cameras, and IoT sensors at exact GPS coordinates.</p>
                </div>
                <div className="p-4 rounded-xl bg-v2v-softwhite border border-v2v-lavendergray">
                  <div className="font-bold text-v2v-deep text-sm mb-1">AI Risk & Readiness</div>
                  <p className="text-gray-600">Execute automated AI readiness evaluations for smart farming deployment.</p>
                </div>
              </div>

              <div>
                <button
                  onClick={() => handleLaunchRole('admin')}
                  className="btn-primary text-sm px-6 py-3 rounded-xl font-semibold"
                >
                  Go to Admin Farmers Console →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── System Blueprint Section ── */}
      <section id="blueprint" className="py-20 bg-v2v-nearblack text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-v2v-lavender">System Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              V2V Agrilythos (AGX) Digital Blueprint
            </h2>
            <p className="text-gray-400 text-sm sm:text-base mt-3">
              An end-to-end data pipeline connecting ground survey teams, PostGIS spatial databases, real-time WebSocket telemetry, and LangChain AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="p-6 rounded-2xl bg-v2v-charcoal border border-v2v-secondary/40 space-y-4">
              <div className="text-xs font-mono text-v2v-lavender uppercase tracking-wider">Layer 01 · Data Ingestion</div>
              <h3 className="text-lg font-bold text-white">Field Survey & GPS Capture</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Field surveyors use handheld GPS receivers and the AgriMap DSP mobile-responsive survey panel to log boundaries, reference benchmarks, and geotagged EXIF photos.
              </p>
              <div className="text-[11px] font-mono text-emerald-400">SRID 4326 · WGS 84</div>
            </div>

            <div className="p-6 rounded-2xl bg-v2v-charcoal border border-v2v-secondary/40 space-y-4">
              <div className="text-xs font-mono text-v2v-lavender uppercase tracking-wider">Layer 02 · Processing Core</div>
              <h3 className="text-lg font-bold text-white">Spatial Validation & Telemetry</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                FastAPI and GeoAlchemy2 validate that internal crop zones strictly reside inside parent field borders. Real-time WebSockets stream borewell runtimes and sensor alerts.
              </p>
              <div className="text-[11px] font-mono text-v2v-lavender">PostgreSQL 16 + PostGIS 3.4</div>
            </div>

            <div className="p-6 rounded-2xl bg-v2v-charcoal border border-v2v-secondary/40 space-y-4">
              <div className="text-xs font-mono text-v2v-lavender uppercase tracking-wider">Layer 03 · Intelligence & UI</div>
              <h3 className="text-lg font-bold text-white">AI Readiness & Interactive Twin</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Farmers explore their complete farm digital twin with clickable borewells and CCTV feeds. LangChain RAG evaluates water proximity and power security for precision agriculture.
              </p>
              <div className="text-[11px] font-mono text-purple-300">Leaflet + React 18 + LangChain</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-v2v-charcoal text-white border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <V2VLogo size="md" variant="light" />
              <span className="text-xs text-gray-400">
                AgriMap DSP — Digital Land & Systems Platform
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs text-gray-400">
              <button onClick={() => handleLaunchRole('farmer')} className="hover:text-v2v-lavender transition-colors">Farmer Portal</button>
              <button onClick={() => handleLaunchRole('admin')} className="hover:text-v2v-lavender transition-colors">Admin Console</button>
              <button onClick={() => handleLaunchRole('verifier')} className="hover:text-v2v-lavender transition-colors">Land Verifier</button>
              <Link to="/login" className="hover:text-v2v-lavender transition-colors">Login</Link>
            </div>

            <div className="text-xs text-gray-500 font-mono">
              © {new Date().getFullYear()} V2V Tech · Vision to Value. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
