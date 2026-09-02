import { useState } from 'react'
import { AlertTriangle, Clock, MapPin, Search, ShieldAlert, ArrowRight, GitCommit, FileText, CheckCircle2 } from 'lucide-react'

const RISK_CONFIG = {
  HIGH: {
    bg: 'bg-white hover:border-rose-300',
    border: 'border-rose-200',
    headerBg: 'bg-rose-50/90',
    badge: 'bg-rose-600 text-white',
    dot: 'bg-rose-500',
    text: 'text-rose-700',
  },
  MEDIUM: {
    bg: 'bg-white hover:border-amber-300',
    border: 'border-amber-200',
    headerBg: 'bg-amber-50/80',
    badge: 'bg-amber-500 text-white',
    dot: 'bg-amber-500',
    text: 'text-amber-800',
  },
  LOW: {
    bg: 'bg-white hover:border-emerald-300',
    border: 'border-slate-200',
    headerBg: 'bg-emerald-50/60',
    badge: 'bg-emerald-600 text-white',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
}

function RiskBar({ score }) {
  const pct = Math.round(score * 100)
  const color =
    score >= 0.7 ? 'bg-rose-500' : score >= 0.4 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500 font-semibold">Severity</span>
      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono font-bold text-slate-700 tabular-nums">{pct}%</span>
    </div>
  )
}

export default function TriageQueue({ reports, loading, selectedId, onSelect, onViewCausalMap }) {
  const [filter, setFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const searchFiltered = reports.filter(r => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      r.report_id.toLowerCase().includes(q) ||
      (r.preview && r.preview.toLowerCase().includes(q)) ||
      (r.site && r.site.toLowerCase().includes(q)) ||
      (r.ehs_code && r.ehs_code.toLowerCase().includes(q))
    )
  })

  const filtered = filter === 'ALL' ? searchFiltered : searchFiltered.filter(r => r.risk_level === filter)

  const counts = {
    ALL: reports.length,
    HIGH: reports.filter(r => r.risk_level === 'HIGH').length,
    MEDIUM: reports.filter(r => r.risk_level === 'MEDIUM').length,
    LOW: reports.filter(r => r.risk_level === 'LOW').length,
    SIF: reports.filter(r => r.sif_potential).length,
  }

  const sifRate = counts.ALL > 0 ? Math.round((counts.SIF / counts.ALL) * 100) : 0

  return (
    <div className="space-y-6 fade-in">
      {/* Executive Overview Banner & Summary Stats */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <ShieldAlert size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Incident Triage Center
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Centralized queue for evaluating safety incidents, risk levels, and preventive actions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 px-3 py-1 rounded-full tabular-nums">
              {counts.ALL} Incidents Logged
            </span>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-rose-50/80 p-3.5 rounded-xl border border-rose-200">
            <span className="text-xs text-rose-800 font-semibold block mb-1">High Priority / SIF</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-rose-900 tabular-nums">{counts.HIGH}</span>
              <span className="text-xs font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200 tabular-nums">
                {sifRate}% High Risk
              </span>
            </div>
          </div>

          <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200">
            <span className="text-xs text-amber-900 font-semibold block mb-1">Medium Risk</span>
            <div>
              <span className="text-2xl font-extrabold text-amber-900 tabular-nums">{counts.MEDIUM}</span>
            </div>
          </div>

          <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200">
            <span className="text-xs text-emerald-900 font-semibold block mb-1">Low Risk</span>
            <div>
              <span className="text-2xl font-extrabold text-emerald-900 tabular-nums">{counts.LOW}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-600 font-semibold block mb-1">Critical Signals</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums">{counts.SIF}</span>
              <span className="text-xs font-semibold text-slate-500">SIF Precursors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filter Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, location, or description..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white font-medium"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.98] ${
                  filter === level
                    ? level === 'HIGH'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : level === 'MEDIUM'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : level === 'LOW'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {level === 'ALL' ? `All Incidents (${counts.ALL})` : `${level} (${counts[level]})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Central Report Cards List */}
      <div>
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="animate-spin w-7 h-7 border-2 border-slate-200 border-t-indigo-600 rounded-full mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-600">Loading incident queue...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200 shadow-2xs font-medium">
            No matching incident reports found for query "{searchQuery}"
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((report) => {
              const cfg = RISK_CONFIG[report.risk_level] || RISK_CONFIG.LOW
              const isSelected = selectedId === report.report_id
              const dateStr = new Date(report.timestamp).toLocaleDateString('en-US', {
                day: '2-digit', month: 'short', year: 'numeric'
              })

              return (
                <div
                  key={report.report_id}
                  className={`bg-white rounded-xl border ${cfg.border} p-5 shadow-2xs transition-all hover:shadow-xs ${
                    isSelected ? 'ring-2 ring-indigo-500/40 bg-indigo-50/20' : ''
                  }`}
                >
                  {/* Row 1: Header info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                      <span className="text-sm font-mono font-extrabold text-slate-900">{report.report_id}</span>
                      {report.ehs_code && (
                        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md">
                          Code: {report.ehs_code}
                        </span>
                      )}
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1 ml-2">
                        <MapPin size={12} className="text-slate-400" />
                        {report.site}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {report.sif_potential && (
                        <span className="text-xs bg-rose-600 text-white px-2.5 py-0.5 rounded-full font-extrabold tracking-wider flex items-center gap-1 shadow-2xs">
                          ⚠ SIF PRECURSOR
                        </span>
                      )}
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${cfg.badge}`}>
                        {report.risk_level} RISK
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Narrative preview */}
                  <p className="text-xs text-slate-800 leading-relaxed bg-slate-50/80 p-3 rounded-lg border border-slate-200/80 mb-3 font-medium">
                    "{report.preview}"
                  </p>

                  {/* Row 3: Meta, gauge & Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-4 text-slate-500 font-medium">
                      <span className="flex items-center gap-1 font-mono text-[11px] tabular-nums">
                        <Clock size={12} className="text-slate-400" />
                        {dateStr}
                      </span>
                      {report.reported_by && (
                        <span>Reporter: <strong className="text-slate-700">{report.reported_by}</strong></span>
                      )}
                      <RiskBar score={report.overall_risk_score} />
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => onViewCausalMap(report)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200 active:scale-[0.98]"
                      >
                        <GitCommit size={14} className="text-indigo-600" />
                        <span>Incident Sequence</span>
                      </button>

                      <button
                        onClick={() => onSelect(report)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs active:scale-[0.98]"
                      >
                        <span>View Hazard Analysis</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
