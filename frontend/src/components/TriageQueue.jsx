import React from 'react'
import { AlertTriangle, Clock, MapPin, Tag } from 'lucide-react'

// Risk configuration mapping to new light theme classes
const RISK_CONFIG = {
  HIGH: {
    borderClass: 'corp-border-tier-1',
    badgeClass: 'bg-[#ffdad6] text-[#ba1a1a]', // error-container and error
    iconColor: 'text-[#ba1a1a]',
    label: 'CRITICAL',
  },
  MEDIUM: {
    borderClass: 'corp-border-tier-3',
    badgeClass: 'bg-[#ffdcbf] text-[#7b2600]', // using warning/tertiary colors
    iconColor: 'text-[#a16207]',
    label: 'WARNING',
  },
  LOW: {
    borderClass: 'corp-border-tier-5',
    badgeClass: 'bg-[#d1fae5] text-[#15803d]', // safe green
    iconColor: 'text-[#15803d]',
    label: 'STANDARD',
  },
  UNKNOWN: {
    borderClass: 'border-t-[3px] border-[#DFE1E6]',
    badgeClass: 'bg-[#F4F5F7] text-[#434654]',
    iconColor: 'text-[#576377]',
    label: 'UNASSESSED',
  },
}

function truncate(str, n = 90) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}

export default function TriageQueue({ reports, selectedId, onSelect }) {
  if (!reports || reports.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-full text-[#576377] space-y-3 font-inter">
        <AlertTriangle size={24} className="text-[#c3c6d6]" />
        <p className="text-[13px] font-semibold text-center max-w-[200px]">
          Incident queue is empty or loading...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 font-inter pr-2">
      {reports.map((report) => {
        const risk = RISK_CONFIG[report.risk_level] || RISK_CONFIG.UNKNOWN
        const isSelected = selectedId === report.report_id
        
        // Systematic Integrity interactive card logic
        let cardBase = `corp-card corp-card-interactive p-4 cursor-pointer flex flex-col relative overflow-hidden transition-all duration-200 `
        cardBase += risk.borderClass

        if (isSelected) {
          // Active state logic - subtle blue lift
          cardBase += ' ring-2 ring-[#0052cc] bg-[#f0f4ff] shadow-sm'
        } else {
          cardBase += ' hover:bg-[#F4F5F7]'
        }

        return (
          <div
            key={report.report_id}
            onClick={() => onSelect(report.report_id)}
            className={cardBase}
          >
            {/* Header Row */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className={`${risk.iconColor} ${report.sif_potential ? 'animate-pulse' : ''}`} />
                <span className="text-[13px] font-bold text-[#191c1e] tracking-tight">
                  {report.report_id}
                </span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-sm tabular-nums tracking-wide ${risk.badgeClass}`}>
                {risk.label}
              </span>
            </div>

            {/* Narrative Snippet */}
            <p className="text-[13px] text-[#434654] leading-relaxed mb-3 line-clamp-2">
              {truncate(report.text, 120)}
            </p>

            {/* Meta Footer */}
            <div className="mt-auto grid grid-cols-1 gap-1.5 pt-3 border-t border-[#DFE1E6] text-[12px] text-[#576377]">
              {report.functional_location && (
                <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
                  <MapPin size={12} className="flex-shrink-0 text-[#737685]" />
                  <span className="truncate" title={report.functional_location}>
                    {report.functional_location}
                  </span>
                </div>
              )}
              {report.incident_cause && (
                <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
                  <Tag size={12} className="flex-shrink-0 text-[#737685]" />
                  <span className="truncate font-medium text-[#434654]" title={report.incident_cause}>
                    {report.incident_cause}
                  </span>
                </div>
              )}
            </div>
            
            {/* SIF Indicator */}
            {report.sif_potential && (
              <div className="absolute top-0 right-0 w-8 h-8 overflow-hidden pointer-events-none">
                <div className="absolute top-[-16px] right-[-16px] w-8 h-8 bg-[#ba1a1a] rotate-45 transform origin-bottom-left shadow-sm"></div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
