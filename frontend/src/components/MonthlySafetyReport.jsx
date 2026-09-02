import React, { useState, useEffect } from 'react'
import { Calendar, ShieldAlert, TrendingUp, GitMerge, Award, RefreshCw } from 'lucide-react'
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
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white rounded-xl border border-slate-200 shadow-2xs max-w-6xl mx-auto">
        <div className="animate-spin w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full mb-3" />
        <p className="text-xs font-semibold text-slate-600">Generating Monthly Executive Report...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in max-w-6xl mx-auto pb-12">
      {/* Top Bar: Selector & Header */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Calendar className="text-indigo-600" size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Monthly Safety Executive Intelligence
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Aggregated Incident Signals, Barrier Trends & Strategic Priorities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-600">Period:</span>
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono font-bold rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500"
          >
            {months.map((m) => (
              <option key={m.month} value={m.month}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => loadReport(selectedMonth)}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-all active:scale-[0.98]"
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
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-xs text-slate-500 font-semibold block mb-1">Total Analyzed</span>
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums">{reportData.total_analyzed_reports}</span>
              <span className="text-[11px] text-slate-500 font-medium block mt-1">Incident Reports</span>
            </div>

            <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-xl shadow-2xs">
              <span className="text-xs text-rose-800 font-semibold block mb-1">SIF Precursors</span>
              <span className="text-2xl font-extrabold text-rose-900 tabular-nums flex items-center gap-1.5">
                {reportData.sif_precursor_count}
                <span className="text-xs text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded">
                  {Math.round((reportData.sif_precursor_count / (reportData.total_analyzed_reports || 1)) * 100)}%
                </span>
              </span>
              <span className="text-[11px] text-rose-700 font-medium block mt-1">Critical Priority Signals</span>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl shadow-2xs">
              <span className="text-xs text-amber-900 font-semibold block mb-1">High Risk Cases</span>
              <span className="text-2xl font-extrabold text-amber-900 tabular-nums">{reportData.high_risk_count}</span>
              <span className="text-[11px] text-amber-800 font-medium block mt-1">Immediate Review</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-xs text-slate-500 font-semibold block mb-1">Standard / Low Risk</span>
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {reportData.medium_risk_count + reportData.low_risk_count}
              </span>
              <span className="text-[11px] text-slate-500 font-medium block mt-1">Routine Observations</span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs lg:col-span-1">
              <span className="text-xs text-slate-500 font-semibold block mb-1">Primary Precursor</span>
              <span className="text-xs font-bold text-amber-900 line-clamp-2 leading-snug">
                {reportData.top_recurring_cause}
              </span>
            </div>
          </div>

          {/* SECTION: Top 3 Strategic Safety Improvements */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="text-indigo-600" size={18} />
                <h3 className="text-sm font-bold text-slate-900">
                  Priority Safety Improvement Actions
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Derived from Causal Frequency Analysis
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {reportData.top_3_improvements.map((imp) => {
                const badgeStyle =
                  imp.priority_rank === 1
                    ? 'bg-rose-600 text-white'
                    : imp.priority_rank === 2
                    ? 'bg-amber-600 text-white'
                    : 'bg-indigo-600 text-white'

                const cardBorder =
                  imp.priority_rank === 1
                    ? 'border-rose-200 bg-rose-50/20'
                    : imp.priority_rank === 2
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-indigo-200 bg-indigo-50/20'

                return (
                  <div
                    key={imp.priority_rank}
                    className={`p-4 rounded-xl ${cardBorder} bg-white border shadow-2xs space-y-3.5`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${badgeStyle} shadow-2xs tabular-nums`}>
                          #{imp.priority_rank}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{imp.title}</h4>
                          <span className="text-xs text-slate-500 font-medium">Target Area: {imp.target_area}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md tabular-nums">
                          Impact: {Math.round(imp.impact_score * 100)}%
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium block mt-1 tabular-nums">
                          Recurrence: {imp.recurrence_count} Linked Reports
                        </span>
                      </div>
                    </div>

                    {/* Historical Linkage Banner */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <span className="font-bold text-slate-800 block mb-0.5">Historical Incident Context:</span>
                      <p className="text-slate-700 leading-relaxed font-medium">{imp.causal_historical_link}</p>
                    </div>

                    {/* Root Cause & Preventive Actions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="font-semibold text-slate-500 block mb-1">Primary Root Cause:</span>
                        <span className="text-slate-900 font-bold">{imp.primary_root_cause}</span>
                      </div>

                      <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200">
                        <span className="font-semibold text-emerald-800 block mb-1">Actionable Safety Controls:</span>
                        <p className="text-emerald-950 leading-relaxed font-medium">{imp.actionable_preventive_control}</p>
                      </div>
                    </div>

                    {/* Standard Tag */}
                    <div className="text-xs text-slate-600 font-semibold flex items-center justify-between pt-2 border-t border-slate-100">
                      <span>Safety Standard Reference: {imp.relevant_standard}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SECTION: Recurring Causal Pattern Links */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <GitMerge className="text-indigo-600" size={18} />
              <h3 className="text-sm font-bold text-slate-900">
                Recurring Incident Cause Linkages
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {reportData.causal_pattern_links.map((link) => (
                <div key={link.link_id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-indigo-900 font-bold">{link.current_report_id} ↔ {link.historical_report_id}</span>
                    <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-mono text-[10px] font-bold tabular-nums">
                      {Math.round(link.similarity_score * 100)}% Match
                    </span>
                  </div>

                  <p className="text-slate-800 font-medium line-clamp-2 leading-relaxed">{link.mechanism_summary}</p>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-500 block font-semibold text-[11px]">Shared Hazard Factor:</span>
                    <span className="text-slate-900 font-bold">{link.shared_cause}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION: Barrier Breakdown & Location Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-200">
            {/* Failing Safety Barriers */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="text-amber-600" size={16} />
                Degraded Safety Barrier Distribution
              </h4>
              <div className="space-y-3 text-xs">
                {Object.entries(reportData.barrier_failure_distribution).map(([barrierName, count]) => (
                  <div key={barrierName} className="space-y-1">
                    <div className="flex justify-between text-slate-800 font-medium">
                      <span>{barrierName}</span>
                      <span className="text-amber-800 font-bold tabular-nums">{count} incidents</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                      <div
                        className="bg-amber-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (count / 7) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Asset Location Risk */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="text-indigo-600" size={16} />
                Functional Location Concentration
              </h4>
              <div className="space-y-3 text-xs">
                {Object.entries(reportData.location_risk_distribution).map(([locName, count]) => (
                  <div key={locName} className="space-y-1">
                    <div className="flex justify-between text-slate-800 font-medium">
                      <span>{locName}</span>
                      <span className="text-indigo-700 font-bold tabular-nums">{count} reports</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
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
