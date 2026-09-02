import React, { useState, useEffect } from 'react'
import { Calendar, ShieldAlert, AlertTriangle, CheckCircle, TrendingUp, GitMerge, FileText, Award, RefreshCw } from 'lucide-react'
import { fetchAnalyticsMonths, fetchMonthlyReport } from '../api/client'

export default function MonthlySafetyReport() {
  const [months, setMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('All-Time')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadMonths = async () => {
    try {
      const data = await fetchAnalyticsMonths()
      setMonths(data.months || [])
    } catch (err) {
      console.error('Failed to fetch analytics months:', err)
    }
  }

  const loadReport = async (m) => {
    setLoading(true)
    try {
      const data = await fetchMonthlyReport(m)
      setReportData(data)
    } catch (err) {
      console.error('Failed to fetch monthly report:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMonths()
    loadReport('All-Time')
  }, [])

  const handleMonthChange = (e) => {
    const val = e.target.value
    setSelectedMonth(val)
    loadReport(val)
  }

  if (loading && !reportData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <div className="animate-spin w-8 h-8 border-2 border-slate-700 border-t-amber-400 rounded-full mb-3" />
        <p className="text-sm font-mono">Synthesizing Monthly Safety Intelligence Report...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in max-w-6xl mx-auto pb-12">
      {/* Top Bar: Selector & Header */}
      <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Calendar className="text-amber-400" size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">
              Monthly Safety Intelligence & Strategic Improvements
            </h2>
            <p className="text-xs text-slate-400">
              Aggregated Precursor Accumulation, Causal Linkage & Top 3 Focus Areas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Period:</label>
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="bg-slate-800 border border-slate-600 text-amber-300 text-xs font-mono font-bold rounded-lg px-3 py-2 outline-none focus:border-amber-500"
          >
            {months.map((m) => (
              <option key={m.month} value={m.month}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => loadReport(selectedMonth)}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            title="Refresh analytics"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {reportData && (
        <>
          {/* Executive Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Analyzed</span>
              <span className="text-2xl font-bold text-white font-mono">{reportData.total_analyzed_reports}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Safety Incident Reports</span>
            </div>

            <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-xl">
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">SIF Precursors</span>
              <span className="text-2xl font-bold text-red-200 font-mono flex items-center gap-1">
                {reportData.sif_precursor_count}
                <span className="text-xs text-red-400 font-normal">({Math.round((reportData.sif_precursor_count / (reportData.total_analyzed_reports || 1)) * 100)}%)</span>
              </span>
              <span className="text-[10px] text-red-300 block mt-0.5">Life-Threatening Signals</span>
            </div>

            <div className="p-3.5 bg-amber-950/30 border border-amber-800/60 rounded-xl">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">High Risk Precursors</span>
              <span className="text-2xl font-bold text-amber-200 font-mono">{reportData.high_risk_count}</span>
              <span className="text-[10px] text-amber-300 block mt-0.5">Immediate Review Cases</span>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Medium / Low Risk</span>
              <span className="text-2xl font-bold text-slate-200 font-mono">
                {reportData.medium_risk_count + reportData.low_risk_count}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Routine Observations</span>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl lg:col-span-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Top Recurring Cause</span>
              <span className="text-xs font-bold text-amber-300 line-clamp-2 mt-1 leading-snug">
                {reportData.top_recurring_cause}
              </span>
            </div>
          </div>

          {/* SECTION: Top 3 Strategic Safety Improvements */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Award className="text-amber-400" size={20} />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Top 3 Strategic Actionable HSE Safety Improvements
              </h3>
              <span className="text-xs text-slate-400 ml-auto">
                Synthesized from Causal Frequency & Barrier Impact Analysis
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {reportData.top_3_improvements.map((imp) => {
                const rankColor =
                  imp.priority_rank === 1
                    ? 'border-red-600 bg-red-950/40 text-red-200'
                    : imp.priority_rank === 2
                    ? 'border-amber-600 bg-amber-950/40 text-amber-200'
                    : 'border-blue-600 bg-blue-950/40 text-blue-200'

                const numBadge =
                  imp.priority_rank === 1
                    ? 'bg-red-700 text-white'
                    : imp.priority_rank === 2
                    ? 'bg-amber-700 text-white'
                    : 'bg-blue-700 text-white'

                return (
                  <div
                    key={imp.priority_rank}
                    className={`p-4 rounded-xl border-l-4 ${rankColor} bg-slate-900/90 border border-slate-700 shadow-md space-y-3`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-sm ${numBadge}`}>
                          #{imp.priority_rank}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-white">{imp.title}</h4>
                          <span className="text-xs text-slate-400">Target Area: {imp.target_area}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-700/80 px-2 py-0.5 rounded">
                          Impact Score: {Math.round(imp.impact_score * 100)}%
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-1">
                          Recurrence: {imp.recurrence_count} Linked Incidents
                        </span>
                      </div>
                    </div>

                    {/* Historical Linkage Banner */}
                    <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-xs">
                      <span className="font-bold text-amber-400 block mb-0.5">🔗 Historical Causal Linkage:</span>
                      <p className="text-slate-300 leading-relaxed font-mono">{imp.causal_historical_link}</p>
                    </div>

                    {/* Root Cause & Preventive Actions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 bg-slate-950/50 rounded border border-slate-800">
                        <span className="font-bold text-slate-400 block uppercase mb-1">Primary Root Cause:</span>
                        <span className="text-red-300 font-semibold">{imp.primary_root_cause}</span>
                      </div>

                      <div className="p-2.5 bg-emerald-950/30 rounded border border-emerald-800/60">
                        <span className="font-bold text-emerald-400 block uppercase mb-1">Actionable Preventive Controls:</span>
                        <p className="text-emerald-200 leading-relaxed font-mono">{imp.actionable_preventive_control}</p>
                      </div>
                    </div>

                    {/* Standard Tag */}
                    <div className="text-[11px] text-purple-300 font-semibold flex items-center justify-between pt-1 border-t border-slate-800">
                      <span>Standard Reference: {imp.relevant_standard}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SECTION: Recurring Causal Pattern Links */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <GitMerge className="text-blue-400" size={20} />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Recurring Incident Cause Linkages (Current ↔ Past Precedents)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {reportData.causal_pattern_links.map((link) => (
                <div key={link.link_id} className="p-3.5 bg-slate-900 border border-slate-700 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-blue-300 font-bold">{link.current_report_id} ↔ {link.historical_report_id}</span>
                    <span className="bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.2 rounded font-mono text-[10px]">
                      {Math.round(link.similarity_score * 100)}% Match
                    </span>
                  </div>

                  <p className="text-slate-200 font-medium line-clamp-2">{link.mechanism_summary}</p>

                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-500 block uppercase font-bold text-[10px]">Shared Cause:</span>
                    <span className="text-amber-300 font-semibold">{link.shared_cause}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION: Barrier Breakdown & Location Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-800">
            {/* Failing Safety Barriers */}
            <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="text-amber-400" size={16} />
                Degraded / Failing Safety Barriers Distribution
              </h4>
              <div className="space-y-2.5 text-xs">
                {Object.entries(reportData.barrier_failure_distribution).map(([barrierName, count]) => (
                  <div key={barrierName} className="space-y-1">
                    <div className="flex justify-between text-slate-300 font-mono">
                      <span>{barrierName}</span>
                      <span className="text-amber-400 font-bold">{count} incidents</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (count / 7) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Asset Location Risk */}
            <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="text-blue-400" size={16} />
                Functional Location Risk Concentration
              </h4>
              <div className="space-y-2.5 text-xs">
                {Object.entries(reportData.location_risk_distribution).map(([locName, count]) => (
                  <div key={locName} className="space-y-1">
                    <div className="flex justify-between text-slate-300 font-mono">
                      <span>{locName}</span>
                      <span className="text-blue-400 font-bold">{count} reports</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (count / 8) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
