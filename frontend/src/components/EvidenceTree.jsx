import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, XCircle, HelpCircle, Info } from 'lucide-react'

// ─── Node type configuration ────────────────────────────────────────────────

const NODE_TYPES = {
  STATED_FACT: {
    icon: '🟢',
    label: 'EXPLICITLY STATED FACT',
    borderColor: 'border-emerald-500',
    bgColor: 'bg-emerald-900/20',
    badgeColor: 'bg-emerald-800/60 text-emerald-200',
    textColor: 'text-emerald-200',
    connectorColor: 'border-emerald-700',
    dotColor: 'bg-emerald-400',
  },
  REQUIRED_CONDITION: {
    icon: '🟡',
    label: 'REQUIRED PHYSICAL STATE',
    borderColor: 'border-amber-500',
    bgColor: 'bg-amber-900/20',
    badgeColor: 'bg-amber-800/60 text-amber-200',
    textColor: 'text-amber-200',
    connectorColor: 'border-amber-700',
    dotColor: 'bg-amber-400',
  },
  IMPLICIT_HAZARD: {
    icon: '🔴',
    label: 'IMPLICIT HAZARD DETECTED',
    borderColor: 'border-red-500',
    bgColor: 'bg-red-900/25',
    badgeColor: 'bg-red-700/70 text-red-200',
    textColor: 'text-red-200',
    connectorColor: 'border-red-700',
    dotColor: 'bg-red-400',
  },
  RULE_REFERENCE: {
    icon: '📐',
    label: 'STANDARD REFERENCE',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-900/20',
    badgeColor: 'bg-blue-800/60 text-blue-200',
    textColor: 'text-blue-200',
    connectorColor: 'border-blue-700',
    dotColor: 'bg-blue-400',
  },
}

// ─── Single tree node ────────────────────────────────────────────────────────

function TreeNode({ type, title, subtitle, details, children, depth = 0, isLast = false }) {
  const [expanded, setExpanded] = useState(true)
  const cfg = NODE_TYPES[type]
  const hasChildren = children && children.length > 0

  return (
    <div className={`relative ${depth > 0 ? 'ml-6' : ''}`}>
      {/* Vertical connector line */}
      {depth > 0 && (
        <div className="absolute left-[-16px] top-0 bottom-0 w-px bg-slate-600" />
      )}
      {depth > 0 && (
        <div className="absolute left-[-16px] top-4 w-4 h-px bg-slate-600" />
      )}

      {/* Node card */}
      <div
        className={`relative mb-2 rounded-lg border-l-4 ${cfg.borderColor} ${cfg.bgColor} p-3 cursor-pointer select-none transition-all hover:brightness-110`}
        onClick={() => hasChildren && setExpanded(e => !e)}
      >
        {/* Node header */}
        <div className="flex items-start gap-2">
          <span className="text-sm mt-0.5 flex-shrink-0">{cfg.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold uppercase tracking-wider ${cfg.textColor}`}>
                {cfg.label}
              </span>
              {hasChildren && (
                <span className="text-slate-500">
                  {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </span>
              )}
            </div>
            <p className="text-sm text-white mt-0.5 font-medium leading-snug">{title}</p>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Detail pills */}
        {details && details.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {details.map((d, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${cfg.badgeColor}`}>
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
          title={`${fact.entity} — ${fact.action}`}
          subtitle={`State: ${fact.state}${fact.location && fact.location !== 'unspecified' ? ` | Location: ${fact.location}` : ''}`}
          details={[`Confidence: ${Math.round(fact.confidence * 100)}%`, fact.raw_text_span ? `"${fact.raw_text_span.substring(0, 60)}…"` : null].filter(Boolean)}
          depth={depth}
        />
      ))}

      {/* Required condition (what SHOULD be there) */}
      <TreeNode
        type="REQUIRED_CONDITION"
        title={hazard.required_condition || 'Required safety state'}
        subtitle="This safety state MUST be verified and documented per physical constraint rules"
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
          hazard.sif_potential ? '⚠ SIF Potential' : null,
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
        <div className={`ml-6 mb-2 p-2.5 rounded border border-slate-600 bg-slate-800/60 text-xs text-slate-300`}>
          <span className="text-slate-400 font-semibold block mb-1">🛡 Immediate Action Required:</span>
          {hazard.mitigation}
        </div>
      )}
    </div>
  )
}

// ─── No hazards found view ───────────────────────────────────────────────────

function NoHazardsView() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <CheckCircle size={36} className="text-emerald-400 mb-3" />
      <h3 className="text-emerald-300 font-semibold mb-1">No Implicit Hazards Detected</h3>
      <p className="text-slate-400 text-sm max-w-xs">
        All physical safety states appear to be either explicitly confirmed or not applicable to this report.
      </p>
    </div>
  )
}

// ─── Main EvidenceTree component ─────────────────────────────────────────────

export default function EvidenceTree({ analysis }) {
  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm">
        <Info size={24} className="mb-2 text-slate-600" />
        Select a report from the queue or analyze custom text to see the evidence tree.
      </div>
    )
  }

  const { inferred_hazards, extracted_facts, overall_risk_score, risk_level } = analysis

  const riskColor =
    risk_level === 'HIGH'
      ? 'text-red-400'
      : risk_level === 'MEDIUM'
      ? 'text-amber-400'
      : 'text-emerald-400'

  return (
    <div className="fade-in">
      {/* Summary banner */}
      <div className="flex items-center justify-between mb-4 p-3 bg-slate-800/60 rounded-lg border border-slate-700">
        <div>
          <span className="text-xs text-slate-400 uppercase tracking-wider">Overall Risk</span>
          <div className={`text-xl font-bold ${riskColor}`}>
            {risk_level}
            <span className="text-sm font-normal text-slate-400 ml-2">
              ({Math.round(overall_risk_score * 100)}%)
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">
            {inferred_hazards.length} hazard{inferred_hazards.length !== 1 ? 's' : ''} inferred
          </div>
          <div className="text-xs text-slate-400">
            {extracted_facts.length} fact{extracted_facts.length !== 1 ? 's' : ''} extracted
          </div>
          {analysis.sif_potential && (
            <div className="text-xs font-bold text-red-400 sif-pulse mt-0.5">
              ⚠ SIF POTENTIAL
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">🟢 Stated Fact</span>
        <span className="flex items-center gap-1.5">🟡 Required Condition</span>
        <span className="flex items-center gap-1.5">🔴 Implicit Hazard</span>
        <span className="flex items-center gap-1.5">📐 Standard Reference</span>
      </div>

      {/* Tree */}
      {inferred_hazards.length === 0 ? (
        <NoHazardsView />
      ) : (
        <div className="space-y-6">
          {inferred_hazards.map((hazard, idx) => (
            <div key={`hazard-${idx}`} className="relative">
              {/* Hazard section header */}
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle
                  size={14}
                  className={hazard.sif_potential ? 'text-red-400' : 'text-amber-400'}
                />
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Constraint Rule {hazard.rule_id} — {hazard.rule_name}
                </span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>

              <HazardSubtree hazard={hazard} depth={1} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
