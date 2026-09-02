import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Info, ShieldAlert } from 'lucide-react'

// ─── Node type configuration ────────────────────────────────────────────────

const NODE_TYPES = {
  STATED_FACT: {
    icon: '🟢',
    label: 'OBSERVED EVENT',
    borderColor: 'border-emerald-200',
    bgColor: 'bg-emerald-50/70',
    badgeColor: 'bg-emerald-100 text-emerald-900 border border-emerald-200',
    textColor: 'text-emerald-900',
    connectorColor: 'bg-emerald-300',
    dotColor: 'bg-emerald-500',
  },
  REQUIRED_CONDITION: {
    icon: '🟡',
    label: 'REQUIRED SAFETY CONDITION',
    borderColor: 'border-amber-200',
    bgColor: 'bg-amber-50/70',
    badgeColor: 'bg-amber-100 text-amber-900 border border-amber-200',
    textColor: 'text-amber-900',
    connectorColor: 'bg-amber-300',
    dotColor: 'bg-amber-500',
  },
  IMPLICIT_HAZARD: {
    icon: '🔴',
    label: 'POTENTIAL HAZARD IDENTIFIED',
    borderColor: 'border-rose-200',
    bgColor: 'bg-rose-50/80',
    badgeColor: 'bg-rose-100 text-rose-900 border border-rose-200 font-bold',
    textColor: 'text-rose-900',
    connectorColor: 'bg-rose-300',
    dotColor: 'bg-rose-500',
  },
  RULE_REFERENCE: {
    icon: '📐',
    label: 'SAFETY STANDARD & RULE',
    borderColor: 'border-indigo-200',
    bgColor: 'bg-indigo-50/70',
    badgeColor: 'bg-indigo-100 text-indigo-900 border border-indigo-200',
    textColor: 'text-indigo-900',
    connectorColor: 'bg-indigo-300',
    dotColor: 'bg-indigo-500',
  },
}

// ─── Single tree node ────────────────────────────────────────────────────────

function TreeNode({ type, title, subtitle, details, children, depth = 0 }) {
  const [expanded, setExpanded] = useState(true)
  const cfg = NODE_TYPES[type]
  const hasChildren = children && children.length > 0

  return (
    <div className={`relative ${depth > 0 ? 'ml-6' : ''}`}>
      {/* Vertical connector line */}
      {depth > 0 && (
        <div className="absolute left-[-16px] top-0 bottom-0 w-px bg-slate-300" />
      )}
      {depth > 0 && (
        <div className="absolute left-[-16px] top-4 w-4 h-px bg-slate-300" />
      )}

      {/* Node card */}
      <div
        className={`relative mb-2.5 rounded-xl ${cfg.bgColor} p-3.5 shadow-2xs border ${cfg.borderColor} cursor-pointer select-none transition-all hover:shadow-xs`}
        onClick={() => hasChildren && setExpanded(e => !e)}
      >
        {/* Node header */}
        <div className="flex items-start gap-2.5">
          <span className="text-base mt-0.5 flex-shrink-0">{cfg.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${cfg.textColor}`}>
                {cfg.label}
              </span>
              {hasChildren && (
                <span className="text-slate-400">
                  {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-900 font-bold leading-snug">{title}</p>
            {subtitle && (
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed font-medium">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Detail pills */}
        {details && details.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-slate-200/60">
            {details.map((d, i) => (
              <span key={i} className={`text-[11px] px-2.5 py-0.5 rounded-md font-mono font-medium ${cfg.badgeColor} tabular-nums`}>
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

// ─── Hazard subtree ──────────────────────────────────────────────────────────

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
          hazard.sif_potential ? '⚠ SIF Precursor' : null,
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
        <div className="ml-6 mb-3 p-3 rounded-xl border border-indigo-200 bg-indigo-50/70 text-xs text-indigo-950 shadow-2xs">
          <span className="text-indigo-950 font-bold block mb-1 flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-indigo-700" />
            Recommended Preventive Action:
          </span>
          <p className="font-medium text-indigo-900 leading-relaxed">{hazard.mitigation}</p>
        </div>
      )}
    </div>
  )
}

// ─── No hazards found view ───────────────────────────────────────────────────

function NoHazardsView() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center bg-emerald-50/50 rounded-xl border border-emerald-200 p-6">
      <CheckCircle size={36} className="text-emerald-600 mb-2" />
      <h3 className="text-emerald-900 font-bold text-sm mb-1">No Critical Safety Gaps Detected</h3>
      <p className="text-slate-600 text-xs max-w-xs leading-relaxed font-medium">
        All mandatory safety conditions appear to be verified and satisfied in this report.
      </p>
    </div>
  )
}

// ─── Main EvidenceTree component ─────────────────────────────────────────────

export default function EvidenceTree({ analysis }) {
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs shadow-2xs p-6">
        <Info size={24} className="mb-2 text-slate-300" />
        Select an incident report from the queue to view its safety hazard structure.
      </div>
    )
  }

  const { inferred_hazards, extracted_facts, overall_risk_score, risk_level } = analysis

  return (
    <div className="fade-in space-y-4">
      {/* Summary banner */}
      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <span className="text-xs text-slate-500 font-semibold block mb-0.5">
            Incident Risk Level
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-extrabold ${risk_level === 'HIGH' ? 'text-rose-700' : risk_level === 'MEDIUM' ? 'text-amber-800' : 'text-emerald-700'}`}>
              {risk_level}
            </span>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 tabular-nums">
              {Math.round(overall_risk_score * 100)}% Severity
            </span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <div className="flex gap-2">
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 tabular-nums">
              {inferred_hazards.length} Safety Hazards
            </span>
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 tabular-nums">
              {extracted_facts.length} Observed Events
            </span>
          </div>
          {analysis.sif_potential && (
            <span className="text-xs font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              ⚠ SIF PRECURSOR DETECTED
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
        <span className="flex items-center gap-1.5">🟢 Observed Event</span>
        <span className="flex items-center gap-1.5">🟡 Required Condition</span>
        <span className="flex items-center gap-1.5">🔴 Potential Hazard</span>
        <span className="flex items-center gap-1.5">📐 Safety Standard</span>
      </div>

      {/* Tree */}
      {inferred_hazards.length === 0 ? (
        <NoHazardsView />
      ) : (
        <div className="space-y-6">
          {inferred_hazards.map((hazard, idx) => (
            <div key={`hazard-${idx}`} className="relative bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
              {/* Hazard section header */}
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                <AlertTriangle
                  size={16}
                  className={hazard.sif_potential ? 'text-rose-600' : 'text-amber-500'}
                />
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Safety Rule {hazard.rule_id} - {hazard.rule_name}
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
