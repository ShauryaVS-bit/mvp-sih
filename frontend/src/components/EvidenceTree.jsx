import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Info, ShieldAlert, AlertOctagon } from 'lucide-react'

// ─── Node Type Configuration for Systematic Integrity Theme ────────────────────────────

const NODE_TYPES = {
  STATED_FACT: {
    icon: '•',
    label: 'OBSERVED EVENT',
    borderColor: 'border-[#DFE1E6]',
    bgColor: 'bg-[#F4F5F7]',
    badgeColor: 'bg-white text-[#434654] border border-[#DFE1E6]',
    textColor: 'text-[#434654]',
  },
  REQUIRED_CONDITION: {
    icon: '⚑',
    label: 'REQUIRED SAFETY BARRIER',
    borderColor: 'border-[#DFE1E6]',
    bgColor: 'bg-[#e5eeff]', // Light blue container
    badgeColor: 'bg-white text-[#0052cc] border border-[#b2c5ff]',
    textColor: 'text-[#0052cc]',
  },
  IMPLICIT_HAZARD: {
    icon: '⚠',
    label: 'POTENTIAL HAZARD IDENTIFIED',
    borderColor: 'border-[#ffdad6]',
    bgColor: 'bg-[#fff5f4]', // Very light red
    badgeColor: 'bg-white text-[#ba1a1a] border border-[#ffdad6]',
    textColor: 'text-[#ba1a1a]',
  },
  RULE_REFERENCE: {
    icon: '§',
    label: 'SAFETY STANDARD & RULE',
    borderColor: 'border-[#DFE1E6]',
    bgColor: 'bg-[#f3f4f6]',
    badgeColor: 'bg-white text-[#576377] border border-[#DFE1E6]',
    textColor: 'text-[#576377]',
  },
}

// ─── Single Tree Node Component ─────────────────────────────────────────────

function TreeNode({ type, title, subtitle, details, children, depth = 0 }) {
  const [expanded, setExpanded] = useState(true)
  const cfg = NODE_TYPES[type]
  const hasChildren = children && children.length > 0

  return (
    <div className={`relative ${depth > 0 ? 'ml-6' : ''}`}>
      {/* Vertical connector line */}
      {depth > 0 && (
        <div className="absolute left-[-16px] top-0 bottom-0 w-px bg-[#DFE1E6]" />
      )}
      {depth > 0 && (
        <div className="absolute left-[-16px] top-4 w-4 h-px bg-[#DFE1E6]" />
      )}

      {/* Node card */}
      <div
        className={`relative mb-2.5 rounded-lg ${cfg.bgColor} p-3.5 border ${cfg.borderColor} cursor-pointer select-none transition-all hover:shadow-sm`}
        onClick={() => hasChildren && setExpanded(e => !e)}
      >
        {/* Node header */}
        <div className="flex items-start gap-2.5">
          <span className={`text-[14px] font-bold mt-0.5 flex-shrink-0 ${cfg.textColor}`}>{cfg.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className={`text-[11px] font-bold uppercase tracking-widest ${cfg.textColor}`}>
                {cfg.label}
              </span>
              {hasChildren && (
                <span className="text-[#737685]">
                  {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#191c1e] font-semibold leading-snug">{title}</p>
            {subtitle && (
              <p className="text-[12px] text-[#576377] mt-0.5 leading-relaxed">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Detail pills */}
        {details && details.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-[#DFE1E6]">
            {details.map((d, i) => (
              <span key={i} className={`text-[11px] px-2 py-0.5 rounded-sm font-semibold tabular-nums ${cfg.badgeColor}`}>
                {d}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="relative">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Hazard Subtree ──────────────────────────────────────────────────────────

function HazardSubtree({ hazard, depth = 1 }) {
  return (
    <div>
      {/* Stated Facts */}
      {hazard.stated_facts.map((fact, fi) => (
        <TreeNode
          key={`fact-${fi}`}
          type="STATED_FACT"
          title={`${fact.entity} - ${fact.action}`}
          subtitle={`State: ${fact.state}${fact.location && fact.location !== 'unspecified' ? ` | Location: ${fact.location}` : ''}`}
          details={[`Confidence: ${Math.round(fact.confidence * 100)}%`, fact.raw_text_span ? `"${fact.raw_text_span.substring(0, 60)}…"` : null].filter(Boolean)}
          depth={depth}
        />
      ))}

      {/* Required condition (what SHOULD be there) */}
      <TreeNode
        type="REQUIRED_CONDITION"
        title={hazard.required_condition || 'Required safety state'}
        subtitle="Required safety control state per operational guidelines"
        details={[hazard.iogp_clause || hazard.iogp_rule].filter(Boolean)}
        depth={depth}
      />

      {/* Implicit Hazard (the gap) */}
      <TreeNode
        type="IMPLICIT_HAZARD"
        title={hazard.hazard_tag.replace(/_/g, ' ')}
        subtitle={hazard.inferred_gap}
        details={[
          `Severity: ${Math.round(hazard.severity_score * 100)}%`,
          hazard.sif_potential ? '⚠ SIF PRECURSOR' : null,
          hazard.oisd_clause || hazard.oisd_standard,
        ].filter(Boolean)}
        depth={depth}
      />

      {/* Standard references */}
      <TreeNode
        type="RULE_REFERENCE"
        title={hazard.iogp_rule}
        subtitle={`${hazard.oisd_standard}${hazard.historical_precedent ? ` | Precedent: ${hazard.historical_precedent}` : ''}`}
        depth={depth}
      />

      {/* Mitigation (if present) */}
      {hazard.mitigation && (
        <div className="ml-6 mb-3 p-3 rounded-lg border border-[#c3c6d6] bg-[#f0f1f3] text-[12px] text-[#191c1e]">
          <span className="text-[#0052cc] font-bold block mb-1 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
            <ShieldAlert size={14} />
            Recommended Preventive Action
          </span>
          <p className="text-[#434654] leading-relaxed">{hazard.mitigation}</p>
        </div>
      )}
    </div>
  )
}

// ─── No Hazards View ─────────────────────────────────────────────────────────

function NoHazardsView() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center bg-[#eff4ff] rounded-lg border border-[#d3e4fe] p-6">
      <CheckCircle size={32} className="text-[#006d35] mb-2" />
      <h3 className="text-[#005226] font-bold text-[13px] mb-1 uppercase tracking-wider">No Critical Safety Gaps Detected</h3>
      <p className="text-[#434654] text-[12px] max-w-xs leading-relaxed">
        All mandatory safety conditions appear to be verified and satisfied in this report.
      </p>
    </div>
  )
}

// ─── Main EvidenceTree Component ─────────────────────────────────────────────

export default function EvidenceTree({ analysis }) {
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-[#F4F5F7] rounded-lg border border-[#DFE1E6] text-[#576377] text-[13px] p-6 text-center">
        <Info size={24} className="mb-2 text-[#737685]" />
        Select an incident report from the queue to view its safety hazard structure.
      </div>
    )
  }

  const { inferred_hazards, extracted_facts, overall_risk_score, risk_level } = analysis

  return (
    <div className="fade-in space-y-4 font-inter">
      {/* Summary Banner */}
      <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-[#DFE1E6] shadow-sm">
        <div>
          <span className="text-[11px] text-[#576377] font-semibold uppercase block mb-0.5">
            Incident Risk Level
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-[18px] font-bold tracking-tight ${risk_level === 'HIGH' ? 'text-[#ba1a1a]' : risk_level === 'MEDIUM' ? 'text-[#7b2600]' : 'text-[#006d35]'}`}>
              {risk_level}
            </span>
            <span className="text-[12px] font-bold text-[#191c1e] bg-[#F4F5F7] px-2 py-0.5 rounded-sm border border-[#DFE1E6] tabular-nums">
              {Math.round(overall_risk_score * 100)}% Severity
            </span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1.5">
          <div className="flex gap-2">
            <span className="text-[12px] font-semibold text-[#434654] bg-[#F4F5F7] px-2.5 py-0.5 rounded-sm border border-[#DFE1E6] tabular-nums">
              {inferred_hazards.length} Safety Hazards
            </span>
            <span className="text-[12px] font-semibold text-[#434654] bg-[#F4F5F7] px-2.5 py-0.5 rounded-sm border border-[#DFE1E6] tabular-nums">
              {extracted_facts.length} Observed Events
            </span>
          </div>
          {analysis.sif_potential && (
            <span className="text-[11px] font-bold text-white bg-[#ba1a1a] px-2.5 py-0.5 rounded-sm flex items-center gap-1 shadow-sm">
              <AlertOctagon size={12} className="text-white" />
              SIF PRECURSOR DETECTED
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[11px] font-bold text-[#434654] bg-[#F4F5F7] p-3 rounded-lg border border-[#DFE1E6]">
        <span className="flex items-center gap-1.5"><span className="text-[#434654]">•</span> Observed Event</span>
        <span className="flex items-center gap-1.5"><span className="text-[#0052cc]">⚑</span> Required Condition</span>
        <span className="flex items-center gap-1.5"><span className="text-[#ba1a1a]">⚠</span> Potential Hazard</span>
        <span className="flex items-center gap-1.5"><span className="text-[#576377]">§</span> Safety Standard</span>
      </div>

      {/* Tree */}
      {inferred_hazards.length === 0 ? (
        <NoHazardsView />
      ) : (
        <div className="space-y-6">
          {inferred_hazards.map((hazard, idx) => (
            <div key={`hazard-${idx}`} className="relative bg-white p-4 rounded-lg border border-[#DFE1E6] shadow-sm">
              {/* Hazard Section Header */}
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#DFE1E6]">
                <AlertTriangle
                  size={15}
                  className={hazard.sif_potential ? 'text-[#ba1a1a]' : 'text-[#7b2600]'}
                />
                <span className="text-[12px] font-bold text-[#191c1e] uppercase tracking-wider">
                  Safety Rule {hazard.rule_id} — {hazard.rule_name}
                </span>
              </div>

              <HazardSubtree hazard={hazard} depth={1} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
