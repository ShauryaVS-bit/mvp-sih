import React, { useState } from 'react'
import { ArrowRight, AlertTriangle, ShieldAlert, CheckCircle, BookOpen, Layers, GitCommit, FileText } from 'lucide-react'

const NODE_STYLE_CONFIG = {
  STATEMENT: {
    border: 'border-[#DFE1E6]',
    bg: 'bg-white',
    badge: 'bg-[#F4F5F7] text-[#434654] border border-[#DFE1E6]',
    titleColor: 'text-[#191c1e]',
    icon: '💬',
    label: 'OPERATIONAL STATEMENT',
  },
  MISSING_BARRIER: {
    border: 'border-[#ffdbcf]',
    bg: 'bg-[#fff5f0]',
    badge: 'bg-[#ffdbcf] text-[#7b2600] border border-[#ffb59b]',
    titleColor: 'text-[#a16207]',
    icon: '❌',
    label: 'DEGRADED / MISSING SAFETY BARRIER',
  },
  HAZARD_CONSEQUENCE: {
    border: 'border-[#ffdad6]',
    bg: 'bg-[#fff5f4]',
    badge: 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab]',
    titleColor: 'text-[#ba1a1a]',
    icon: '🔴',
    label: 'SAFETY HAZARD / CONSEQUENCE',
  },
  GROUNDING_PROOF: {
    border: 'border-[#DFE1E6]',
    bg: 'bg-[#f8f9fb]',
    badge: 'bg-[#dae2ff] text-[#0052cc] border border-[#b2c5ff]',
    titleColor: 'text-[#0052cc]',
    icon: '📘',
    label: 'SAFETY RULE REFERENCE',
  },
}

export default function StatementCausalMap({ analysis }) {
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  if (!analysis) {
    return (
      <div className="p-8 text-center text-[#576377] text-[13px] bg-[#F4F5F7] rounded-lg border border-[#DFE1E6] shadow-sm font-inter">
        Select an incident report from the queue to view its event sequence.
      </div>
    )
  }

  const causalGraph = analysis.causal_graph || { nodes: [], edges: [] }
  const nodes = causalGraph.nodes || []

  const statementNodes = nodes.filter(n => n.node_type === 'STATEMENT')
  const hazardNodes = nodes.filter(n => n.node_type !== 'STATEMENT')

  return (
    <div className="space-y-6 fade-in font-inter">
      {/* Top Banner: Incident Context */}
      <div className="p-4 bg-white border border-[#DFE1E6] rounded-lg space-y-3 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers className="text-[#0052cc]" size={18} />
            <h3 className="text-[13px] font-bold text-[#191c1e] uppercase tracking-wider">
              Incident Metadata & Sequence Context
            </h3>
          </div>
          <span className="text-[11px] bg-[#F4F5F7] text-[#434654] border border-[#DFE1E6] px-2.5 py-1 rounded-sm font-bold tabular-nums">
            VERIFIED RECORD
          </span>
        </div>

        {/* EHS Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-[12px]">
          <div className="bg-[#F4F5F7] p-3 rounded-md border border-[#DFE1E6]">
            <span className="text-[11px] text-[#576377] block mb-0.5 font-semibold">Location / Rig</span>
            <span className="text-[#191c1e] font-bold">
              {analysis.functional_location || 'AHWR-50-04 Work Over Rig'}
            </span>
          </div>

          <div className="bg-[#eff4ff] p-3 rounded-md border border-[#c4d2ff]">
            <span className="text-[11px] text-[#0052cc] block mb-0.5 font-semibold">Incident Category</span>
            <span className="text-[#0040a2] font-bold">
              {analysis.ehs_code ? `[${analysis.ehs_code}] ${analysis.ehs_short_desc}` : 'Near Miss'}
            </span>
          </div>

          <div className="bg-[#F4F5F7] p-3 rounded-md border border-[#DFE1E6]">
            <span className="text-[11px] text-[#576377] block mb-0.5 font-semibold">Primary Cause</span>
            <span className="text-[#191c1e] font-semibold">
              {analysis.incident_cause || 'Improper Material Handling'}
            </span>
          </div>

          <div className="bg-[#F4F5F7] p-3 rounded-md border border-[#DFE1E6]">
            <span className="text-[11px] text-[#576377] block mb-0.5 font-semibold">Root Cause Category</span>
            <span className="text-[#434654] line-clamp-1 font-semibold">
              {analysis.root_cause_analysis || 'Procedural Non-Compliance'}
            </span>
          </div>
        </div>

        {/* Action Items if present */}
        {(analysis.corrective_action || analysis.preventive_action) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] pt-3 border-t border-[#DFE1E6]">
            {analysis.corrective_action && (
              <div className="bg-[#d1fae5] border border-[#a7f3d0] rounded-md p-3 text-[#006d35]">
                <span className="font-bold block mb-1 text-[11px] uppercase tracking-wide">Corrective Action Taken:</span>
                <p className="font-medium">{analysis.corrective_action}</p>
              </div>
            )}
            {analysis.preventive_action && (
              <div className="bg-[#e5eeff] border border-[#b2c5ff] rounded-md p-3 text-[#0052cc]">
                <span className="font-bold block mb-1 text-[11px] uppercase tracking-wide">Preventive Action Required:</span>
                <p className="font-medium text-[#0040a2]">{analysis.preventive_action}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Safety Attributes Breakdown */}
      {analysis.fact_tuple && (
        <div className="p-4 bg-white border border-[#DFE1E6] rounded-lg space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="text-[#0052cc]" size={16} />
              <h4 className="text-[13px] font-bold text-[#191c1e] uppercase tracking-wider">
                Extracted Safety Attributes
              </h4>
            </div>
            <span className="text-[11px] bg-[#F4F5F7] text-[#434654] border border-[#DFE1E6] px-2 py-0.5 rounded-sm font-bold tabular-nums">
              STRUCTURED EXTRACTION
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-[12px]">
            {/* Activity */}
            <div className="bg-[#F4F5F7] p-3 rounded-md border border-[#DFE1E6] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-[#576377] font-semibold">Activity</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#e5eeff] text-[#0052cc] border border-[#b2c5ff] font-bold">
                    {analysis.fact_tuple.activity_status}
                  </span>
                </div>
                <p className="text-[#191c1e] font-bold leading-snug">{analysis.fact_tuple.activity}</p>
              </div>
            </div>

            {/* Equipment */}
            <div className="bg-[#F4F5F7] p-3 rounded-md border border-[#DFE1E6] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-[#576377] font-semibold">Equipment</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#e5eeff] text-[#0052cc] border border-[#b2c5ff] font-bold">
                    {analysis.fact_tuple.equipment_status}
                  </span>
                </div>
                <p className="text-[#191c1e] font-bold leading-snug">{analysis.fact_tuple.equipment}</p>
              </div>
            </div>

            {/* Energy Source */}
            <div className="bg-[#F4F5F7] p-3 rounded-md border border-[#DFE1E6] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-[#576377] font-semibold">Energy Source</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#ffdbcf] text-[#7b2600] border border-[#ffb59b] font-bold">
                    {analysis.fact_tuple.energy_status}
                  </span>
                </div>
                <p className="text-[#a16207] font-bold leading-snug">{analysis.fact_tuple.energy_source}</p>
              </div>
            </div>

            {/* Exposure */}
            <div className="bg-[#F4F5F7] p-3 rounded-md border border-[#DFE1E6] flex flex-col justify-between lg:col-span-2">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-[#576377] font-semibold">Human Exposure Path</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab] font-bold">
                    {analysis.fact_tuple.exposure_status}
                  </span>
                </div>
                <p className="text-[#ba1a1a] font-bold leading-snug">{analysis.fact_tuple.exposure}</p>
              </div>
            </div>

            {/* Barrier State */}
            <div className="bg-[#F4F5F7] p-3 rounded-md border border-[#DFE1E6] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-[#576377] font-semibold">Barrier Condition</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#ffdbcf] text-[#7b2600] border border-[#ffb59b] font-bold">
                    {analysis.fact_tuple.barrier_condition}
                  </span>
                </div>
                <p className="text-[#a16207] font-bold leading-snug">{analysis.fact_tuple.barrier}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline of Statements */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <GitCommit className="text-[#0052cc]" size={16} />
          <h4 className="text-[13px] font-bold text-[#191c1e] uppercase tracking-wider">
            Timeline of Events & Statements
          </h4>
          <span className="text-[12px] text-[#576377] ml-auto font-semibold tabular-nums">
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
                <div className={`p-4 rounded-lg ${cfg.bg} border ${cfg.border} shadow-sm`}>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-sm bg-[#e5eeff] text-[#0052cc] border border-[#b2c5ff] flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5 tabular-nums">
                      S{stmtNode.statement_index}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[12px] font-bold text-[#0052cc] uppercase tracking-wider">
                          Statement {stmtNode.statement_index}
                        </span>
                        <div className="flex gap-1.5 font-semibold">
                          <span className="text-[10px] px-2 py-0.5 rounded-sm bg-[#F4F5F7] text-[#434654] border border-[#DFE1E6]">
                            Entity: {stmtNode.extracted_entity}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-sm bg-[#F4F5F7] text-[#434654] border border-[#DFE1E6]">
                            Action: {stmtNode.extracted_action}
                          </span>
                        </div>
                      </div>
                      <p className="text-[13px] text-[#191c1e] leading-relaxed bg-[#F4F5F7] p-2.5 rounded-md border border-[#DFE1E6] font-medium">
                        "{stmtNode.raw_statement}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sequence Arrow */}
                {!isLast && (
                  <div className="flex justify-center my-1.5">
                    <ArrowRight size={14} className="text-[#576377] rotate-90" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Identified Barrier Gaps & Root Cause Paths */}
      {hazardNodes.length > 0 && (
        <div className="mt-8 pt-6 border-t border-[#DFE1E6] space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-[#ba1a1a]" size={18} />
            <h4 className="text-[14px] font-bold text-[#191c1e] uppercase tracking-wider">
              Identified Barrier Gaps & Cause Analysis
            </h4>
          </div>

          <div className="space-y-4">
            {hazardNodes.map((node) => {
              const cfg = NODE_STYLE_CONFIG[node.node_type] || NODE_STYLE_CONFIG.STATEMENT

              return (
                <div
                  key={node.node_id}
                  className={`p-4 rounded-lg ${cfg.bg} border ${cfg.border} shadow-sm`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-[16px] mt-0.5">{cfg.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-[12px] font-bold uppercase tracking-wider ${cfg.titleColor}`}>
                          {cfg.label}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-sm font-bold ${cfg.badge}`}>
                          {node.extracted_state}
                        </span>
                      </div>

                      <h5 className="text-[14px] font-bold text-[#191c1e] mb-1.5">
                        {node.extracted_entity}
                      </h5>

                      <p className="text-[13px] text-[#434654] leading-relaxed bg-white p-2.5 rounded-md border border-[#DFE1E6] font-medium">
                        {node.raw_statement}
                      </p>

                      {node.missing_barrier_description && (
                        <div className="mt-3 text-[12px] text-[#7b2600] bg-[#fff5f0] p-3 rounded-md border border-[#ffdbcf]">
                          <span className="font-bold block mb-0.5">⚠️ BARRIER GAP:</span>
                          {node.missing_barrier_description}
                        </div>
                      )}

                      {node.matched_evidence_snippet && (
                        <div className="mt-3 text-[12px] text-[#0052cc] bg-[#e5eeff] p-3 rounded-md border border-[#b2c5ff]">
                          <span className="font-bold block mb-0.5">📘 RULE PRECEDENT:</span>
                          <p className="font-semibold text-[#0040a2]">{node.matched_evidence_snippet}</p>
                          {node.matched_evidence_source && (
                            <span className="text-[10px] text-[#001848] font-bold block mt-1">
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
