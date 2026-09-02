import { useState, useEffect } from 'react'
import { AlertTriangle, ChevronRight, Clock, MapPin, User } from 'lucide-react'

const RISK_CONFIG = {
  HIGH: {
    bg: 'bg-red-900/40',
    border: 'border-red-700',
    badge: 'bg-red-500 text-white',
    dot: 'bg-red-400',
    text: 'text-red-300',
    activeBg: 'bg-red-900/60',
    activeBorder: 'border-red-400',
  },
  MEDIUM: {
    bg: 'bg-amber-900/30',
    border: 'border-amber-700',
    badge: 'bg-amber-500 text-white',
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    activeBg: 'bg-amber-900/50',
    activeBorder: 'border-amber-400',
  },
  LOW: {
    bg: 'bg-slate-800/60',
    border: 'border-slate-600',
    badge: 'bg-emerald-700 text-white',
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    activeBg: 'bg-slate-700/80',
    activeBorder: 'border-slate-400',
  },
}

function RiskBar({ score }) {
  const pct = Math.round(score * 100)
  const color =
    score >= 0.7 ? 'bg-red-500' : score >= 0.4 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
    </div>
  )
}

export default function TriageQueue({ reports, loading, selectedId, onSelect }) {
  const [filter, setFilter] = useState('ALL')

  const filtered = filter === 'ALL' ? reports : reports.filter(r => r.risk_level === filter)

  const counts = {
    ALL: reports.length,
    HIGH: reports.filter(r => r.risk_level === 'HIGH').length,
    MEDIUM: reports.filter(r => r.risk_level === 'MEDIUM').length,
    LOW: reports.filter(r => r.risk_level === 'LOW').length,
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-700">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={18} className="text-red-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Triage Queue
          </h2>
          <span className="ml-auto text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
            {reports.length}
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(level => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`flex-1 text-xs py-1 rounded font-medium transition-colors ${
                filter === level
                  ? level === 'HIGH'
                    ? 'bg-red-600 text-white'
                    : level === 'MEDIUM'
                    ? 'bg-amber-600 text-white'
                    : level === 'LOW'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {level === 'ALL' ? `All (${counts.ALL})` : `${level[0]} (${counts[level]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Report List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-slate-500 text-sm">
            <div className="animate-spin w-6 h-6 border-2 border-slate-600 border-t-red-400 rounded-full mx-auto mb-2" />
            Loading reports...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm">No reports found</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtered.map((report, idx) => {
              const cfg = RISK_CONFIG[report.risk_level] || RISK_CONFIG.LOW
              const isSelected = selectedId === report.report_id
              const dateStr = new Date(report.timestamp).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short'
              })

              return (
                <button
                  key={report.report_id}
                  onClick={() => onSelect(report)}
                  className={`w-full text-left p-3 transition-all duration-150 ${
                    isSelected
                      ? `${cfg.activeBg} border-l-2 ${cfg.activeBorder}`
                      : `${cfg.bg} border-l-2 border-transparent hover:border-slate-500 hover:bg-slate-800/80`
                  }`}
                >
                  {/* Row 1: ID + SAP EHS code + badge */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${cfg.dot} ${report.sif_potential ? 'sif-pulse' : ''}`} />
                      <span className="text-xs font-mono text-slate-400">{report.report_id}</span>
                      {report.ehs_code && (
                        <span className="text-[10px] font-mono px-1 py-0.2 bg-slate-800 text-amber-300 border border-slate-700 rounded">
                          [{report.ehs_code}]
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {report.sif_potential && (
                        <span className="text-xs bg-red-700/80 text-red-200 px-1.5 py-0.5 rounded font-bold">
                          SIF
                        </span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${cfg.badge}`}>
                        {report.risk_level}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Preview text */}
                  <p className="text-xs text-slate-300 line-clamp-2 mb-1.5 leading-relaxed">
                    {report.preview}
                  </p>

                  {/* Row 3: Meta */}
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {report.site}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {dateStr}
                    </span>
                  </div>

                  {/* Risk bar */}
                  <RiskBar score={report.overall_risk_score} />

                  {isSelected && (
                    <ChevronRight
                      size={14}
                      className={`ml-auto mt-1 ${cfg.text}`}
                    />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="p-3 border-t border-slate-700 bg-slate-900/80">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-red-400 font-bold text-sm">{counts.HIGH}</div>
            <div className="text-slate-500 text-xs">HIGH</div>
          </div>
          <div>
            <div className="text-amber-400 font-bold text-sm">{counts.MEDIUM}</div>
            <div className="text-slate-500 text-xs">MED</div>
          </div>
          <div>
            <div className="text-emerald-400 font-bold text-sm">{counts.LOW}</div>
            <div className="text-slate-500 text-xs">LOW</div>
          </div>
        </div>
      </div>
    </div>
  )
}
