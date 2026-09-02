import React, { useState, useEffect } from 'react'
import { Calendar, ShieldAlert, TrendingUp, GitMerge, Award, RefreshCw, AlertOctagon } from 'lucide-react'
import { fetchAnalyticsMonths, fetchMonthlyReport } from '../api/client'

export default function MonthlySafetyReport() {
  const [months, setMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('All-Time')
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadMonths = async () => {
    try {
      const data = await fetchAnalyticsMonths()
      setMonths(Array.isArray(data) ? data : (data.months || []))
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
      <div className="flex flex-col items-center justify-center py-24 text-[#576377] bg-white rounded-lg border border-[#DFE1E6] shadow-sm max-w-6xl mx-auto font-inter">
        <div className="animate-spin w-8 h-8 border-2 border-[#DFE1E6] border-t-[#0052cc] rounded-full mb-3" />
        <p className="text-[13px] font-semibold text-[#434654]">Generating Executive Safety Intelligence Report...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in max-w-6xl mx-auto pb-12 font-inter">
      {/* Top Bar: Selector & Header */}
      <div className="p-4 bg-white border border-[#DFE1E6] rounded-lg flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-md bg-[#f0f4ff] border border-[#d4e0f8] flex items-center justify-center">
            <Calendar className="text-[#0052cc]" size={20} />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#191c1e] leading-tight tracking-tight">
              Monthly Safety Executive Intelligence
            </h2>
            <p className="text-[13px] text-[#576377] mt-0.5">
              Aggregated Incident Signals, Degraded Barrier Frequency & Strategic Priorities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[12px] font-semibold text-[#576377]">Period:</span>
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="bg-[#F4F5F7] border border-[#DFE1E6] text-[#191c1e] text-[13px] font-semibold rounded-sm px-3 py-1.5 outline-none focus:border-[#0052cc] focus:ring-1 focus:ring-[#0052cc]"
          >
            {months.map((m) => (
              <option key={m.month} value={m.month}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => loadReport(selectedMonth)}
            className="p-1.5 text-[#576377] hover:text-[#0052cc] bg-[#F4F5F7] hover:bg-[#e5eeff] rounded-sm border border-[#DFE1E6] transition-all active:scale-[0.98]"
            title="Refresh executive analytics"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {reportData && (
        <>
          {/* Executive Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 bg-white border border-[#DFE1E6] rounded-lg shadow-sm">
              <span className="text-[11px] text-[#576377] font-semibold block mb-1 uppercase tracking-wider">TOTAL ANALYZED</span>
              <span className="text-[24px] font-bold text-[#191c1e] tabular-nums">{reportData.total_analyzed_reports}</span>
              <span className="text-[12px] text-[#434654] block mt-1">Incident Reports</span>
            </div>

            <div className="p-4 bg-white border border-[#DFE1E6] corp-border-tier-1 rounded-lg shadow-sm">
              <span className="text-[11px] text-[#ba1a1a] font-semibold block mb-1 uppercase tracking-wider">SIF PRECURSORS</span>
              <span className="text-[24px] font-bold text-[#ba1a1a] tabular-nums flex items-center gap-2">
                {reportData.sif_precursor_count}
                <span className="text-[11px] text-[#93000a] bg-[#ffdad6] px-1.5 py-0.5 rounded-sm border border-[#ffb4ab]">
                  {Math.round((reportData.sif_precursor_count / (reportData.total_analyzed_reports || 1)) * 100)}%
                </span>
              </span>
              <span className="text-[12px] text-[#434654] block mt-1">Critical Priority Signals</span>
            </div>

            <div className="p-4 bg-white border border-[#DFE1E6] corp-border-tier-3 rounded-lg shadow-sm">
              <span className="text-[11px] text-[#a16207] font-semibold block mb-1 uppercase tracking-wider">HIGH RISK CASES</span>
              <span className="text-[24px] font-bold text-[#a16207] tabular-nums">{reportData.high_risk_count}</span>
              <span className="text-[12px] text-[#434654] block mt-1">Immediate Action</span>
            </div>

            <div className="p-4 bg-white border border-[#DFE1E6] corp-border-tier-5 rounded-lg shadow-sm">
              <span className="text-[11px] text-[#15803d] font-semibold block mb-1 uppercase tracking-wider">STANDARD / LOW RISK</span>
              <span className="text-[24px] font-bold text-[#15803d] tabular-nums">
                {reportData.medium_risk_count + reportData.low_risk_count}
              </span>
              <span className="text-[12px] text-[#434654] block mt-1">Routine Observations</span>
            </div>

            <div className="p-4 bg-[#f8f9fb] border border-[#DFE1E6] rounded-lg shadow-sm lg:col-span-1">
              <span className="text-[11px] text-[#576377] font-semibold block mb-1 uppercase tracking-wider">PRIMARY PRECURSOR</span>
              <span className="text-[13px] font-semibold text-[#191c1e] line-clamp-2 leading-snug">
                {reportData.top_recurring_cause}
              </span>
            </div>
          </div>

          {/* SECTION: Top 3 Strategic Safety Improvements */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="text-[#0052cc]" size={18} />
                <h3 className="text-[14px] font-bold text-[#191c1e] uppercase tracking-wider">
                  Priority Safety Improvement Actions
                </h3>
              </div>
              <span className="text-[12px] text-[#576377] font-semibold">
                Derived from Causal Frequency Analysis
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {reportData.top_3_improvements.map((imp) => {
                const badgeStyle =
                  imp.priority_rank === 1
                    ? 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab]'
                    : imp.priority_rank === 2
                    ? 'bg-[#ffdbcf] text-[#7b2600] border border-[#ffb59b]'
                    : 'bg-[#e5eeff] text-[#0052cc] border border-[#b2c5ff]'

                const cardBorder =
                  imp.priority_rank === 1
                    ? 'corp-border-tier-1 border-[#DFE1E6] bg-white'
                    : imp.priority_rank === 2
                    ? 'corp-border-tier-2 border-[#DFE1E6] bg-white'
                    : 'corp-border-tier-4 border-[#DFE1E6] bg-white'

                return (
                  <div
                    key={imp.priority_rank}
                    className={`p-5 rounded-lg ${cardBorder} border shadow-sm space-y-4`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-sm flex items-center justify-center font-bold text-[13px] ${badgeStyle} tabular-nums`}>
                          #{imp.priority_rank}
                        </span>
                        <div>
                          <h4 className="text-[15px] font-bold text-[#191c1e]">{imp.title}</h4>
                          <span className="text-[12px] text-[#576377] font-semibold">Target Area: <span className="text-[#434654]">{imp.target_area}</span></span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-[12px] font-bold text-[#191c1e] bg-[#F4F5F7] border border-[#DFE1E6] px-2.5 py-1 rounded-sm tabular-nums">
                          IMPACT SCORE: {Math.round(imp.impact_score * 100)}%
                        </span>
                        <span className="text-[11px] text-[#576377] font-semibold block mt-1 tabular-nums">
                          Recurrence: {imp.recurrence_count} Linked Incidents
                        </span>
                      </div>
                    </div>

                    {/* Historical Linkage Banner */}
                    <div className="p-3 bg-[#f8f9fb] rounded-md border border-[#DFE1E6] text-[13px]">
                      <span className="font-bold text-[#434654] block mb-0.5 uppercase tracking-wide text-[11px]">Historical Incident Context:</span>
                      <p className="text-[#191c1e] leading-relaxed">{imp.causal_historical_link}</p>
                    </div>

                    {/* Root Cause & Preventive Actions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
                      <div className="p-4 bg-white rounded-md border border-[#DFE1E6]">
                        <span className="text-[11px] text-[#576377] font-semibold uppercase block mb-1">Primary Root Cause:</span>
                        <span className="text-[#ba1a1a] font-bold">{imp.primary_root_cause}</span>
                      </div>

                      <div className="p-4 bg-[#eff4ff] rounded-md border border-[#c4d2ff]">
                        <span className="text-[11px] text-[#0052cc] font-semibold uppercase block mb-1">Actionable Preventive Controls:</span>
                        <p className="text-[#0040a2] font-semibold leading-relaxed">{imp.actionable_preventive_control}</p>
                      </div>
                    </div>

                    {/* Standard Tag */}
                    <div className="text-[12px] text-[#576377] font-semibold flex items-center justify-between pt-3 border-t border-[#DFE1E6]">
                      <span>Safety Standard Reference: <span className="text-[#191c1e] font-bold">{imp.relevant_standard}</span></span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SECTION: Recurring Causal Pattern Links */}
          <div className="space-y-4 pt-4 border-t border-[#DFE1E6]">
            <div className="flex items-center gap-2">
              <GitMerge className="text-[#0052cc]" size={18} />
              <h3 className="text-[14px] font-bold text-[#191c1e] uppercase tracking-wider">
                Recurring Incident Cause Linkages
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
              {reportData.causal_pattern_links.map((link) => (
                <div key={link.link_id} className="p-4 bg-white border border-[#DFE1E6] rounded-lg space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#0052cc] font-bold tabular-nums tracking-tight">{link.current_report_id} ↔ {link.historical_report_id}</span>
                    <span className="bg-[#e5eeff] text-[#0052cc] border border-[#b2c5ff] px-2 py-0.5 rounded-sm text-[11px] font-bold tabular-nums">
                      {Math.round(link.similarity_score * 100)}% MATCH
                    </span>
                  </div>

                  <p className="text-[#434654] font-medium line-clamp-2 leading-relaxed">{link.mechanism_summary}</p>

                  <div className="pt-2 border-t border-[#DFE1E6]">
                    <span className="text-[#576377] block font-semibold text-[11px] uppercase">Shared Hazard Factor:</span>
                    <span className="text-[#191c1e] font-bold">{link.shared_cause}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION: Barrier Breakdown & Location Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-[#DFE1E6]">
            {/* Failing Safety Barriers */}
            <div className="p-4 bg-white border border-[#DFE1E6] rounded-lg space-y-4 shadow-sm">
              <h4 className="text-[13px] font-bold text-[#191c1e] uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="text-[#ba1a1a]" size={16} />
                Degraded Safety Barrier Frequency
              </h4>
              <div className="space-y-3 text-[13px]">
                {Object.entries(reportData.barrier_failure_distribution).map(([barrierName, count]) => (
                  <div key={barrierName} className="space-y-1.5">
                    <div className="flex justify-between text-[#434654] font-semibold">
                      <span>{barrierName}</span>
                      <span className="text-[#ba1a1a] font-bold tabular-nums">{count} incidents</span>
                    </div>
                    <div className="w-full bg-[#F4F5F7] rounded-full h-1.5 overflow-hidden border border-[#DFE1E6]">
                      <div
                        className="bg-[#ba1a1a] h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (count / 7) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Asset Location Risk */}
            <div className="p-4 bg-white border border-[#DFE1E6] rounded-lg space-y-4 shadow-sm">
              <h4 className="text-[13px] font-bold text-[#191c1e] uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="text-[#0052cc]" size={16} />
                Functional Location Risk Concentration
              </h4>
              <div className="space-y-3 text-[13px]">
                {Object.entries(reportData.location_risk_distribution).map(([locName, count]) => (
                  <div key={locName} className="space-y-1.5">
                    <div className="flex justify-between text-[#434654] font-semibold">
                      <span>{locName}</span>
                      <span className="text-[#0052cc] font-bold tabular-nums">{count} reports</span>
                    </div>
                    <div className="w-full bg-[#F4F5F7] rounded-full h-1.5 overflow-hidden border border-[#DFE1E6]">
                      <div
                        className="bg-[#0052cc] h-1.5 rounded-full transition-all"
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
