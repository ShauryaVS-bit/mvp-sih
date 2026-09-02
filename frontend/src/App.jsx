import { useState, useEffect } from 'react'
import { Shield, Activity, FileText, AlertTriangle, RefreshCw, GitCommit, Award, Sparkles, ArrowUpRight } from 'lucide-react'
import TriageQueue from './components/TriageQueue'
import EvidenceTree from './components/EvidenceTree'
import GroundingPanel from './components/GroundingPanel'
import ReportAnalyzer from './components/ReportAnalyzer'
import StatementCausalMap from './components/StatementCausalMap'
import MonthlySafetyReport from './components/MonthlySafetyReport'
import { fetchReports, analyzeReportById, checkHealth } from './api/client'

// ─── Header ─────────────────────────────────────────────────────────────────

function Header({ health, onRefresh }) {
  return (
    <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between flex-shrink-0 shadow-2xs">
      <div className="flex items-center gap-3.5">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 text-white shadow-xs">
          <Shield size={20} className="text-indigo-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-slate-900 font-extrabold text-base tracking-tight leading-none">
              OIL SENTINEL
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
              Enterprise Safety System
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">
            AI Safety Risk Analysis & Incident Prevention Platform
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold border ${health ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
          <span className={`w-2 h-2 rounded-full ${health ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          {health ? 'System Ready' : 'Connecting...'}
        </div>
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all border border-slate-200 flex items-center gap-1.5 text-xs font-bold shadow-2xs active:scale-[0.98]"
          title="Refresh reports"
        >
          <RefreshCw size={13} />
          <span>Refresh Data</span>
        </button>
      </div>
    </header>
  )
}

// ─── Raw Report Panel ───────────────────────────────────────────────────────

function RawReportPanel({ report, analysis, loading }) {
  if (!report && !analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center text-slate-400 bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <FileText size={22} className="mb-2 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">Select any incident report from the queue to view details</p>
      </div>
    )
  }

  const text = analysis?.raw_text || report?.raw_text || ''
  const riskLevel = analysis?.risk_level || report?.risk_level
  const score = analysis?.overall_risk_score || report?.overall_risk_score || 0

  const riskBadgeStyle =
    riskLevel === 'HIGH'
      ? 'text-rose-700 bg-rose-50 border-rose-200'
      : riskLevel === 'MEDIUM'
      ? 'text-amber-800 bg-amber-50 border-amber-200'
      : 'text-emerald-700 bg-emerald-50 border-emerald-200'

  return (
    <div className="bg-slate-100/60 p-1.5 rounded-2xl border border-slate-200/80">
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Incident Details & Narrative
            </span>
          </div>
          <div className="flex items-center gap-2">
            {riskLevel && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${riskBadgeStyle}`}>
                {riskLevel} RISK · {Math.round(score * 100)}% Severity
              </span>
            )}
            {loading && (
              <div className="animate-spin w-4 h-4 border-2 border-slate-200 border-t-indigo-600 rounded-full" />
            )}
          </div>
        </div>
        <p className="text-xs text-slate-800 leading-relaxed bg-slate-50 rounded-lg p-3.5 border border-slate-200 font-mono font-medium">
          {text}
        </p>
      </div>
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'triage_queue', label: 'Incident Queue', icon: AlertTriangle },
  { id: 'inspect', label: 'Safety Analysis & Hazards', icon: Shield },
  { id: 'causal_map', label: 'Incident Flow & Barriers', icon: GitCommit },
  { id: 'monthly_report', label: 'Executive Safety Report', icon: Award },
  { id: 'analyze', label: 'Analyze New Report', icon: Sparkles },
]

export default function App() {
  const [reports, setReports] = useState([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [health, setHealth] = useState(null)
  const [activeTab, setActiveTab] = useState('triage_queue')

  const loadReports = async () => {
    setReportsLoading(true)
    try {
      const data = await fetchReports()
      setReports(data)
    } catch (err) {
      console.error('Failed to load reports:', err)
    } finally {
      setReportsLoading(false)
    }
  }

  const loadHealth = async () => {
    try {
      const data = await checkHealth()
      setHealth(data)
    } catch {
      setHealth(null)
    }
  }

  useEffect(() => {
    loadHealth()
    loadReports()
  }, [])

  const handleSelectReport = async (report, targetTab = 'inspect') => {
    setSelectedReport(report)
    setActiveTab(targetTab)
    setAnalysisLoading(true)
    setAnalysis(null)
    try {
      const result = await analyzeReportById(report.report_id)
      setAnalysis(result)
    } catch (err) {
      console.error('Analysis failed:', err)
    } finally {
      setAnalysisLoading(false)
    }
  }

  const handleCustomAnalysis = (result) => {
    setAnalysis(result)
    setSelectedReport(null)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-100/60 font-sans">
      <Header health={health} onRefresh={loadReports} />

      <div className="flex flex-1 overflow-hidden flex-col">
        {/* Main Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6 flex-shrink-0 gap-1.5 shadow-2xs">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-xs font-bold border-b-2 transition-all ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/40'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon size={15} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Central Workspace Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60">
          {activeTab === 'triage_queue' ? (
            <div className="max-w-6xl mx-auto space-y-6">
              <TriageQueue
                reports={reports}
                loading={reportsLoading}
                selectedId={selectedReport?.report_id}
                onSelect={(report) => handleSelectReport(report, 'inspect')}
                onViewCausalMap={(report) => handleSelectReport(report, 'causal_map')}
              />
            </div>
          ) : activeTab === 'monthly_report' ? (
            <MonthlySafetyReport />
          ) : activeTab === 'causal_map' ? (
            <div className="max-w-6xl space-y-6 mx-auto">
              <RawReportPanel
                report={selectedReport}
                analysis={analysis}
                loading={analysisLoading}
              />
              <StatementCausalMap analysis={analysis} />
            </div>
          ) : activeTab === 'inspect' ? (
            <div className="space-y-6 max-w-full">
              {/* Report Metadata Ribbon */}
              {(selectedReport || analysis) && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    {(selectedReport || analysis)?.report_id}
                  </span>
                  {selectedReport?.site && (
                    <span className="font-bold text-slate-800 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                      📍 {selectedReport.site}
                    </span>
                  )}
                  {selectedReport?.reported_by && (
                    <span className="font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                      👤 Reporter: {selectedReport.reported_by}
                    </span>
                  )}
                  {selectedReport?.category && (
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 font-bold rounded-md border border-indigo-200">
                      Category: {selectedReport.category}
                    </span>
                  )}
                  {analysis?.processing_time_ms && (
                    <span className="ml-auto font-mono text-slate-400 font-semibold text-[11px]">
                      ⚡ Analyzed in {analysis.processing_time_ms}ms
                    </span>
                  )}
                </div>
              )}

              {/* Narrative Brief */}
              <RawReportPanel
                report={selectedReport}
                analysis={analysis}
                loading={analysisLoading}
              />

              {/* Grid: Hazard & Root Cause Tree + Rules Grounding Panel */}
              {(analysis || analysisLoading) && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Left: Hazard & Evidence Tree */}
                  <div className="xl:col-span-2 space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-indigo-600" />
                      <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Safety Hazard & Cause Structure
                      </h2>
                    </div>
                    {analysisLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200 shadow-2xs text-slate-500">
                        <div className="animate-spin w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full mb-3" />
                        <p className="text-sm font-semibold text-slate-700">Analyzing Safety Incident Details...</p>
                      </div>
                    ) : (
                      <EvidenceTree analysis={analysis} />
                    )}
                  </div>

                  {/* Right: Regulatory Rules Panel */}
                  <div className="xl:col-span-1 space-y-3">
                    <GroundingPanel evidenceMatches={analysis?.evidence_matches || []} />
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!selectedReport && !analysis && !analysisLoading && (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200 shadow-2xs text-center">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3">
                    <Shield size={24} className="text-indigo-600" />
                  </div>
                  <h3 className="text-slate-900 font-bold text-base mb-1">
                    No Incident Selected
                  </h3>
                  <p className="text-slate-500 text-xs max-w-md leading-relaxed font-medium">
                    Select an incident report from the Incident Queue to review root causes, missing safety barriers, and regulatory rules.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Custom Analysis Tab */
            <div className="max-w-4xl space-y-6 mx-auto">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <h2 className="text-base font-bold text-slate-900">Analyze Custom Incident Report</h2>
                <p className="text-slate-500 text-xs leading-relaxed font-medium">
                  Enter any field observation or incident report to extract safety hazards, missing controls, and applicable safety standards.
                </p>
              </div>

              <ReportAnalyzer onAnalysisComplete={handleCustomAnalysis} />

              {analysis && (
                <div className="space-y-6 border-t border-slate-200 pt-6">
                  <StatementCausalMap analysis={analysis} />
                  <EvidenceTree analysis={analysis} />
                  <GroundingPanel evidenceMatches={analysis.evidence_matches || []} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
