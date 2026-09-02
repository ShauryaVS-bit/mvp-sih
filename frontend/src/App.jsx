import { useState, useEffect } from 'react'
import { Brain, Shield, Activity, FileText, AlertTriangle, CheckCircle, XCircle, RefreshCw, GitCommit, Layers, Award } from 'lucide-react'
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
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-600/20 border border-red-600/40">
          <Brain size={20} className="text-red-400" />
        </div>
        <div>
          <h1 className="text-white font-bold text-base leading-none">
            Neuro-Symbolic SIF Risk Engine
          </h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Causal Graph & SAP EHS Process Safety Dashboard — v2.0
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {health && (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              {health.rag_indexed ? (
                <CheckCircle size={12} className="text-emerald-400" />
              ) : (
                <XCircle size={12} className="text-red-400" />
              )}
              <span className="text-slate-400">RAG Index</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers size={12} className="text-purple-400" />
              <span className="text-slate-400">NetworkX Causal DAG</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield size={12} className="text-blue-400" />
              <span className="text-slate-400">{health.rules_loaded} rules loaded</span>
            </div>
          </div>
        )}
        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${health ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700' : 'bg-red-900/40 text-red-300 border border-red-700'}`}>
          <Activity size={10} />
          {health ? 'Online' : 'Connecting...'}
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          title="Refresh reports"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </header>
  )
}

// ─── Raw Report Panel ───────────────────────────────────────────────────────

function RawReportPanel({ report, analysis, loading }) {
  if (!report && !analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center text-slate-500">
        <FileText size={24} className="mb-2 text-slate-600" />
        <p className="text-sm">Select a report from the queue to inspect</p>
      </div>
    )
  }

  const text = analysis?.raw_text || report?.raw_text || ''
  const riskLevel = analysis?.risk_level || report?.risk_level
  const score = analysis?.overall_risk_score || report?.overall_risk_score || 0

  const riskColor =
    riskLevel === 'HIGH'
      ? 'text-red-400 bg-red-900/30 border-red-700'
      : riskLevel === 'MEDIUM'
      ? 'text-amber-400 bg-amber-900/30 border-amber-700'
      : 'text-emerald-400 bg-emerald-900/30 border-emerald-700'

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <FileText size={14} className="text-slate-400" />
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Field Narrative
        </span>
        {riskLevel && (
          <span className={`ml-auto text-xs px-2 py-0.5 rounded border font-semibold ${riskColor}`}>
            {riskLevel} · {Math.round(score * 100)}%
          </span>
        )}
        {loading && (
          <div className="ml-2 animate-spin w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full" />
        )}
      </div>
      <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/40 rounded-lg p-3 border border-slate-700 font-mono">
        {text}
      </p>
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'monthly_report', label: 'Monthly Safety Report & Improvements', icon: Award },
  { id: 'causal_map', label: 'Causal Statement Map', icon: GitCommit },
  { id: 'inspect', label: 'Inspect Evidence Tree', icon: Shield },
  { id: 'analyze', label: 'Analyze Custom Report', icon: Brain },
]



export default function App() {
  const [reports, setReports] = useState([])
  const [reportsLoading, setReportsLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [health, setHealth] = useState(null)
  const [activeTab, setActiveTab] = useState('inspect')

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

  const handleSelectReport = async (report) => {
    setSelectedReport(report)
    setActiveTab('inspect')
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
    <div className="h-screen flex flex-col overflow-hidden bg-slate-950">
      <Header health={health} onRefresh={loadReports} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Triage Queue */}
        <div className="w-72 flex-shrink-0 overflow-hidden">
          <TriageQueue
            reports={reports}
            loading={reportsLoading}
            selectedId={selectedReport?.report_id}
            onSelect={handleSelectReport}
          />
        </div>

        {/* Right: Main Panel */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-950">
          {/* Tab bar */}
          <div className="flex border-b border-slate-700 bg-slate-900 px-4 flex-shrink-0">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Content area — scrollable layout */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'monthly_report' ? (
              <MonthlySafetyReport />
            ) : activeTab === 'causal_map' ? (
              <div className="max-w-5xl space-y-5">
                <RawReportPanel
                  report={selectedReport}
                  analysis={analysis}
                  loading={analysisLoading}
                />
                <StatementCausalMap analysis={analysis} />
              </div>
            ) : activeTab === 'inspect' ? (

              <div className="space-y-5 max-w-full">
                {/* Metadata row */}
                {(selectedReport || analysis) && (
                  <div className="flex items-center gap-4 text-xs text-slate-400 pb-2 border-b border-slate-800">
                    <span className="font-mono text-slate-300">{(selectedReport || analysis)?.report_id}</span>
                    {selectedReport?.site && <span>📍 {selectedReport.site}</span>}
                    {selectedReport?.reported_by && <span>👤 {selectedReport.reported_by}</span>}
                    {selectedReport?.category && (
                      <span className="px-2 py-0.5 bg-slate-800 rounded">
                        {selectedReport.category}
                      </span>
                    )}
                    {analysis?.processing_time_ms && (
                      <span className="ml-auto text-slate-500">
                        ⚡ {analysis.processing_time_ms}ms
                      </span>
                    )}
                  </div>
                )}

                {/* Raw narrative */}
                <RawReportPanel
                  report={selectedReport}
                  analysis={analysis}
                  loading={analysisLoading}
                />

                {/* Two column: Evidence Tree + Grounding Panel */}
                {(analysis || analysisLoading) && (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    {/* Evidence Tree — wider */}
                    <div className="xl:col-span-2">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={15} className="text-amber-400" />
                        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                          Evidence Tree
                        </h2>
                      </div>
                      {analysisLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                          <div className="animate-spin w-8 h-8 border-2 border-slate-700 border-t-blue-400 rounded-full mb-3" />
                          <p className="text-sm">Running 3-step pipeline...</p>
                        </div>
                      ) : (
                        <EvidenceTree analysis={analysis} />
                      )}
                    </div>

                    {/* Grounding Panel — narrower */}
                    <div className="xl:col-span-1">
                      <GroundingPanel evidenceMatches={analysis?.evidence_matches || []} />
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!selectedReport && !analysis && !analysisLoading && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Shield size={48} className="text-slate-700 mb-4" />
                    <h3 className="text-slate-400 font-medium mb-2">
                      No Report Selected
                    </h3>
                    <p className="text-slate-500 text-sm max-w-md">
                      Click any report in the triage queue on the left to run the full
                      neuro-symbolic analysis pipeline, or switch to "Analyze Custom" to
                      paste your own text.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Analyze Custom Tab */
              <div className="max-w-4xl space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-white mb-1">Custom Report Analysis</h2>
                  <p className="text-slate-400 text-sm">
                    Paste any field safety narrative to run the Neuro-Symbolic Causal Graph pipeline:
                    sentence segmentation → constraint evaluation → RAG evidence retrieval.
                  </p>
                </div>

                <ReportAnalyzer onAnalysisComplete={handleCustomAnalysis} />

                {/* Show analysis result inline */}
                {analysis && (
                  <div className="space-y-5 border-t border-slate-700 pt-5">
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
    </div>
  )
}
