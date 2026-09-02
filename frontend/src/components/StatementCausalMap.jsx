import React, { useState } from 'react'
import { ArrowRight, AlertTriangle, ShieldAlert, CheckCircle, BookOpen, Layers, GitCommit, FileText } from 'lucide-react'

const NODE_STYLE_CONFIG = {
  STATEMENT: {
    border: 'border-indigo-200',
    bg: 'bg-indigo-50/50',
    badge: 'bg-indigo-100 text-indigo-900 border border-indigo-200',
    titleColor: 'text-indigo-900',
    icon: '💬',
    label: 'OPERATIONAL STATEMENT',
  },
  MISSING_BARRIER: {
    border: 'border-amber-200',
    bg: 'bg-amber-50/70',
    badge: 'bg-amber-100 text-amber-900 border border-amber-200 font-bold',
    titleColor: 'text-amber-900',
    icon: '❌',
    label: 'MISSING SAFETY BARRIER',
  },
  HAZARD_CONSEQUENCE: {
    border: 'border-rose-200',
    bg: 'bg-rose-50/80',
    badge: 'bg-rose-100 text-rose-900 border border-rose-200 font-bold',
    titleColor: 'text-rose-900',
    icon: '🔴',
    label: 'SAFETY HAZARD / CONSEQUENCE',
  },
  GROUNDING_PROOF: {
    border: 'border-purple-200',
    bg: 'bg-purple-50/60',
    badge: 'bg-purple-100 text-purple-900 border border-purple-200',
    titleColor: 'text-purple-900',
    icon: '📘',
    label: 'SAFETY RULE REFERENCE',
  },
}

export default function StatementCausalMap({ analysis }) {
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  if (!analysis) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200 shadow-2xs">
        Select an incident report from the queue to view its event sequence.
      </div>
    )
  }

  const causalGraph = analysis.causal_graph || { nodes: [], edges: [] }
  const nodes = causalGraph.nodes || []

  const statementNodes = nodes.filter(n => n.node_type === 'STATEMENT')
  const hazardNodes = nodes.filter(n => n.node_type !== 'STATEMENT')

  return (
    <div className="space-y-6 fade-in">
      {/* Top Banner: Incident Context */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="text-indigo-600" size={18} />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Incident Metadata & Sequence Context
            </h3>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full font-mono font-bold">
            Verified Record
          </span>
        </div>

        {/* EHS Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block mb-0.5">Location / Rig</span>
            <span className="text-slate-900 font-mono font-semibold">
              {analysis.functional_location || 'AHWR-50-04 Work Over Rig'}
            </span>
          </div>

          <div className="bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
            <span className="text-xs text-amber-900 font-semibold block mb-0.5">Incident Category</span>
            <span className="text-amber-950 font-semibold">
              {analysis.ehs_code ? `[${analysis.ehs_code}] ${analysis.ehs_short_desc}` : 'Near Miss'}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block mb-0.5">Primary Cause</span>
            <span className="text-slate-900 font-medium">
              {analysis.incident_cause || 'Improper Material Handling'}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 font-semibold block mb-0.5">Root Cause Category</span>
            <span className="text-slate-700 line-clamp-1 font-medium">
              {analysis.root_cause_analysis || 'Procedural Non-Compliance'}
            </span>
          </div>
        </div>

        {/* Action Items if present */}
        {(analysis.corrective_action || analysis.preventive_action) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
            {analysis.corrective_action && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-emerald-900">
                <span className="font-bold text-emerald-800 block mb-0.5">Corrective Action Taken:</span>
                <p className="text-slate-700 font-medium">{analysis.corrective_action}</p>
              </div>
            )}
            {analysis.preventive_action && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 text-indigo-900">
                <span className="font-bold text-indigo-800 block mb-0.5">Preventive Action Required:</span>
                <p className="text-slate-700 font-medium">{analysis.preventive_action}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Safety Attributes Breakdown */}
      {analysis.fact_tuple && (
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="text-indigo-600" size={16} />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Extracted Safety Attributes
              </h4>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-mono font-bold">
              Structured Extraction
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* Activity */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 font-semibold">Activity</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 font-mono font-bold">
                    {analysis.fact_tuple.activity_status}
                  </span>
                </div>
                <p className="text-slate-900 font-bold">{analysis.fact_tuple.activity}</p>
              </div>
            </div>

            {/* Equipment */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 font-semibold">Equipment</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 font-mono font-bold">
                    {analysis.fact_tuple.equipment_status}
                  </span>
                </div>
                <p className="text-slate-900 font-bold">{analysis.fact_tuple.equipment}</p>
              </div>
            </div>

            {/* Energy Source */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 font-semibold">Energy Source</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200 font-mono font-bold">
                    {analysis.fact_tuple.energy_status}
                  </span>
                </div>
                <p className="text-amber-900 font-bold font-mono">{analysis.fact_tuple.energy_source}</p>
              </div>
            </div>

            {/* Exposure */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col justify-between lg:col-span-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 font-semibold">Human Exposure Path</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-900 border border-rose-200 font-mono font-bold">
                    {analysis.fact_tuple.exposure_status}
                  </span>
                </div>
                <p className="text-rose-900 font-bold">{analysis.fact_tuple.exposure}</p>
              </div>
            </div>

            {/* Barrier State */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500 font-semibold">Barrier Condition</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200 font-mono font-bold">
                    {analysis.fact_tuple.barrier_condition}
                  </span>
                </div>
                <p className="text-amber-900 font-bold">{analysis.fact_tuple.barrier}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline of Statements */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <GitCommit className="text-amber-500" size={16} />
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Timeline of Events & Statements
          </h4>
          <span className="text-xs text-slate-500 ml-auto font-medium tabular-nums">
            {statementNodes.length} Incident Statements
          </span>
        </div>

        <div className="space-y-3">
          {statementNodes.map((stmtNode, idx) => {
            const cfg = NODE_STYLE_CONFIG.STATEMENT
            const isLast = idx === statementNodes.length - 1

            return (
              <div key={stmtNode.node_id} className="relative">
                {/* Statement Card */}
                <div className={`p-4 rounded-xl ${cfg.bg} border ${cfg.border} shadow-2xs bg-white`}>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 mt-0.5 shadow-2xs tabular-nums">
                      S{stmtNode.statement_index}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider">
                          Statement {stmtNode.statement_index}
                        </span>
                        <div className="flex gap-1.5">
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono font-semibold">
                            Entity: {stmtNode.extracted_entity}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono font-semibold">
                            Action: {stmtNode.extracted_action}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-800 font-sans leading-relaxed bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 font-medium">
                        "{stmtNode.raw_statement}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sequence arrow */}
                {!isLast && (
                  <div className="flex justify-center my-1.5">
                    <ArrowRight size={14} className="text-slate-400 rotate-90" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Identified Barrier Gaps & Root Cause Paths */}
      {hazardNodes.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-200 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-rose-600" size={18} />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Identified Barrier Gaps & Cause Analysis
            </h4>
          </div>

          <div className="space-y-4">
            {hazardNodes.map((node) => {
              const cfg = NODE_STYLE_CONFIG[node.node_type] || NODE_STYLE_CONFIG.STATEMENT

              return (
                <div
                  key={node.node_id}
                  className={`p-4 rounded-xl ${cfg.bg} border ${cfg.border} shadow-2xs bg-white`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{cfg.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-xs font-extrabold uppercase tracking-wider ${cfg.titleColor}`}>
                          {cfg.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${cfg.badge}`}>
                          {node.extracted_state}
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-slate-900 mb-1">
                        {node.extracted_entity}
                      </h5>

                      <p className="text-xs text-slate-800 leading-relaxed font-sans bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 font-medium">
                        {node.raw_statement}
                      </p>

                      {node.missing_barrier_description && (
                        <div className="mt-2.5 text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                          <span className="font-bold block mb-0.5">⚠️ Barrier Gap:</span>
                          {node.missing_barrier_description}
                        </div>
                      )}

                      {node.matched_evidence_snippet && (
                        <div className="mt-2.5 text-xs text-purple-900 bg-purple-50 p-2.5 rounded-lg border border-purple-200">
                          <span className="font-bold block mb-0.5">📘 Rule Precedent:</span>
                          <p className="font-sans text-purple-950 font-medium">{node.matched_evidence_snippet}</p>
                          {node.matched_evidence_source && (
                            <span className="text-[10px] text-purple-800 font-bold block mt-1">
                              Source: {node.matched_evidence_source}
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
