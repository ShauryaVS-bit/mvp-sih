import React, { useState } from 'react'
import { ArrowRight, AlertTriangle, ShieldAlert, CheckCircle, BookOpen, Layers, GitCommit, FileText } from 'lucide-react'

const NODE_STYLE_CONFIG = {
  STATEMENT: {
    border: 'border-blue-500/80',
    bg: 'bg-blue-950/40',
    badge: 'bg-blue-800/60 text-blue-200',
    titleColor: 'text-blue-200',
    icon: '💬',
    label: 'OPERATIONAL STATEMENT',
  },
  MISSING_BARRIER: {
    border: 'border-amber-500/90',
    bg: 'bg-amber-950/50',
    badge: 'bg-amber-700/80 text-amber-200 font-bold',
    titleColor: 'text-amber-200',
    icon: '❌',
    label: 'MISSING BARRIER NODE',
  },
  HAZARD_CONSEQUENCE: {
    border: 'border-red-600',
    bg: 'bg-red-950/60',
    badge: 'bg-red-700 text-white font-bold',
    titleColor: 'text-red-200',
    icon: '🔴',
    label: 'HAZARD CONSEQUENCE',
  },
  GROUNDING_PROOF: {
    border: 'border-purple-500/80',
    bg: 'bg-purple-950/40',
    badge: 'bg-purple-800/70 text-purple-200',
    titleColor: 'text-purple-200',
    icon: '📘',
    label: 'EVIDENCE GROUNDING PROOF',
  },
}

export default function StatementCausalMap({ analysis }) {
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  if (!analysis) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm">
        Select or analyze a report to view the Statement-to-Statement Causal Map.
      </div>
    )
  }

  const causalGraph = analysis.causal_graph || { nodes: [], edges: [] }
  const nodes = causalGraph.nodes || []
  const edges = causalGraph.edges || []

  // Separate statement nodes from barrier/hazard/proof nodes
  const statementNodes = nodes.filter(n => n.node_type === 'STATEMENT')
  const hazardNodes = nodes.filter(n => n.node_type !== 'STATEMENT')

  return (
    <div className="space-y-6 fade-in">
      {/* Top Banner: SAP EHS Metadata & Model Architecture */}
      <div className="p-4 bg-slate-900/90 border border-slate-700 rounded-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="text-blue-400" size={18} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              SAP EHS Incident Context & Causal Graph
            </h3>
          </div>
          <span className="text-xs bg-purple-900/50 text-purple-300 border border-purple-700 px-2.5 py-1 rounded-full font-mono">
            Model: Neuro-Symbolic Causal DAG (NetworkX)
          </span>
        </div>

        {/* EHS Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700">
            <span className="text-slate-500 font-semibold block uppercase">Func. Location</span>
            <span className="text-slate-200 font-mono font-medium">
              {analysis.functional_location || 'AHWR-50-04 Work Over Rig'}
            </span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700">
            <span className="text-slate-500 font-semibold block uppercase">SAP EHS Category</span>
            <span className="text-amber-300 font-semibold">
              {analysis.ehs_code ? `[${analysis.ehs_code}] ${analysis.ehs_short_desc}` : 'M — Near Miss'}
            </span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700">
            <span className="text-slate-500 font-semibold block uppercase">Incident Cause</span>
            <span className="text-slate-200">
              {analysis.incident_cause || 'IMPROPER MATERIAL HANDLING'}
            </span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700">
            <span className="text-slate-500 font-semibold block uppercase">Root Cause Analysis</span>
            <span className="text-slate-300 line-clamp-1">
              {analysis.root_cause_analysis || 'PROCEDURAL NON-COMPLIANCE'}
            </span>
          </div>
        </div>

        {/* Corrective / Preventive Actions banner if present */}
        {(analysis.corrective_action || analysis.preventive_action) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-800">
            {analysis.corrective_action && (
              <div className="bg-emerald-950/30 border border-emerald-800/60 rounded p-2 text-emerald-200">
                <span className="font-bold text-emerald-400 block mb-0.5">Corrective Action Taken:</span>
                {analysis.corrective_action}
              </div>
            )}
            {analysis.preventive_action && (
              <div className="bg-blue-950/30 border border-blue-800/60 rounded p-2 text-blue-200">
                <span className="font-bold text-blue-400 block mb-0.5">Preventive Action Required:</span>
                {analysis.preventive_action}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Multi-Aspect Extracted Fact 5-Tuple (DeBERTa / SetFit Model Output) */}
      {analysis.fact_tuple && (
        <div className="p-4 bg-slate-900 border border-blue-800/50 rounded-xl space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="text-emerald-400" size={16} />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Multi-Aspect Safety Fact 5-Tuple (Evidence Discipline)
              </h4>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded font-mono">
              Model: SetFit / DeBERTa-v3 Multi-Aspect Classifier
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* Activity */}
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-500 font-bold uppercase">Activity</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                    {analysis.fact_tuple.activity_status}
                  </span>
                </div>
                <p className="text-slate-200 font-medium">{analysis.fact_tuple.activity}</p>
              </div>
            </div>

            {/* Equipment */}
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-500 font-bold uppercase">Equipment</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                    {analysis.fact_tuple.equipment_status}
                  </span>
                </div>
                <p className="text-slate-200 font-medium">{analysis.fact_tuple.equipment}</p>
              </div>
            </div>

            {/* Energy Source */}
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-500 font-bold uppercase">Energy Source</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                    {analysis.fact_tuple.energy_status}
                  </span>
                </div>
                <p className="text-amber-200 font-medium font-mono">{analysis.fact_tuple.energy_source}</p>
              </div>
            </div>

            {/* Exposure */}
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex flex-col justify-between lg:col-span-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-500 font-bold uppercase">Human Exposure Path</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800 font-mono">
                    {analysis.fact_tuple.exposure_status}
                  </span>
                </div>
                <p className="text-red-200 font-medium">{analysis.fact_tuple.exposure}</p>
              </div>
            </div>

            {/* Barrier State */}
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-500 font-bold uppercase">Barrier Condition</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                    {analysis.fact_tuple.barrier_condition}
                  </span>
                </div>
                <p className="text-amber-300 font-medium">{analysis.fact_tuple.barrier}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Causal Event Sequence Map: Statement-to-Statement Flow */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <GitCommit className="text-amber-400" size={16} />
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Statement-to-Statement Causal Event Sequence
          </h4>
          <span className="text-xs text-slate-500 ml-auto">
            {statementNodes.length} Operational Statements Segmented
          </span>
        </div>

        <div className="space-y-3">
          {statementNodes.map((stmtNode, idx) => {
            const cfg = NODE_STYLE_CONFIG.STATEMENT
            const isLast = idx === statementNodes.length - 1

            return (
              <div key={stmtNode.node_id} className="relative">
                {/* Statement Card */}
                <div className={`p-3.5 rounded-xl border-l-4 ${cfg.border} ${cfg.bg} bg-slate-900/80 border border-slate-700/80 shadow-md`}>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-900/80 text-blue-200 flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 mt-0.5">
                      S{stmtNode.statement_index}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-blue-300 uppercase">
                          Statement {stmtNode.statement_index}
                        </span>
                        <div className="flex gap-1.5">
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                            Entity: {stmtNode.extracted_entity}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                            Action: {stmtNode.extracted_action}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-200 font-mono leading-relaxed bg-slate-950/50 p-2 rounded border border-slate-800">
                        "{stmtNode.raw_statement}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sequence arrow */}
                {!isLast && (
                  <div className="flex justify-center my-1.5">
                    <ArrowRight size={14} className="text-slate-600 rotate-90" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Causal Hazard Reasoning Graph: Missing Barrier ➔ Hazard Consequence ➔ Evidence Proof */}
      {hazardNodes.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-red-400" size={18} />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Inferred Causal Path & Evidence Grounding Nodes
            </h4>
          </div>

          <div className="space-y-4">
            {hazardNodes.map((node) => {
              const cfg = NODE_STYLE_CONFIG[node.node_type] || NODE_STYLE_CONFIG.STATEMENT

              return (
                <div
                  key={node.node_id}
                  className={`p-4 rounded-xl border-l-4 ${cfg.border} ${cfg.bg} bg-slate-900/90 border border-slate-700 shadow-lg`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{cfg.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase tracking-wider ${cfg.titleColor}`}>
                          {cfg.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${cfg.badge}`}>
                          {node.extracted_state}
                        </span>
                      </div>

                      <h5 className="text-sm font-semibold text-white mb-1">
                        {node.extracted_entity}
                      </h5>

                      <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-950/60 p-2.5 rounded border border-slate-800">
                        {node.raw_statement}
                      </p>

                      {node.missing_barrier_description && (
                        <div className="mt-2 text-xs text-amber-300 bg-amber-950/40 p-2 rounded border border-amber-800/60">
                          <span className="font-bold block mb-0.5">⚠️ Barrier Gap:</span>
                          {node.missing_barrier_description}
                        </div>
                      )}

                      {node.matched_evidence_snippet && (
                        <div className="mt-2 text-xs text-purple-200 bg-purple-950/40 p-2 rounded border border-purple-800/60">
                          <span className="font-bold block mb-0.5">📘 Grounding Proof Snippet:</span>
                          <p className="font-mono text-slate-300">{node.matched_evidence_snippet}</p>
                          {node.matched_evidence_source && (
                            <span className="text-[10px] text-purple-400 font-semibold block mt-1">
                              Precedent Source: {node.matched_evidence_source}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
