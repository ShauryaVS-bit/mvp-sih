import { BookOpen } from 'lucide-react'

const SOURCE_CONFIG = {
  iogp_rules: {
    icon: '📋',
    color: 'border-[#c3c6d6] bg-[#f8f9fb]',
    headerColor: 'text-[#0052cc]',
    badgeColor: 'bg-[#dae2ff] text-[#001848] border border-[#b2c5ff]',
    label: 'IOGP Safety Standards',
  },
  oisd_guidelines: {
    icon: '📐',
    color: 'border-[#c3c6d6] bg-[#f8f9fb]',
    headerColor: 'text-[#7b2600]',
    badgeColor: 'bg-[#ffdbcf] text-[#380d00] border border-[#ffb59b]',
    label: 'OISD Process Safety Rules',
  },
  baghjan_investigation: {
    icon: '🔥',
    color: 'border-[#c3c6d6] bg-[#f8f9fb]',
    headerColor: 'text-[#ba1a1a]',
    badgeColor: 'bg-[#ffdad6] text-[#93000a] border border-[#ffb4ab]',
    label: 'Industry Case Reference',
  },
}

function SimilarityMeter({ score }) {
  const pct = Math.round(score * 100)
  const color =
    score >= 0.7 ? 'bg-[#006d35]' : score >= 0.5 ? 'bg-[#a16207]' : 'bg-[#576377]'
  const textColor =
    score >= 0.7 ? 'text-[#005226]' : score >= 0.5 ? 'text-[#7b2600]' : 'text-[#434654]'

  return (
    <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-[#DFE1E6]">
      <span className="text-[12px] text-[#576377] font-semibold">Relevance:</span>
      <div className="flex-1 h-1.5 bg-[#e1e2e4] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[12px] font-bold ${textColor} tabular-nums`}>
        {pct}%
      </span>
    </div>
  )
}

export default function GroundingPanel({ evidenceMatches }) {
  if (!evidenceMatches || evidenceMatches.length === 0) {
    return (
      <div className="p-5 text-center text-[#576377] text-[13px] bg-[#F4F5F7] rounded-lg border border-[#DFE1E6]">
        <BookOpen size={20} className="mx-auto mb-2 text-[#737685]" />
        No regulatory evidence matches retrieved.
      </div>
    )
  }

  return (
    <div className="space-y-3 font-inter">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen size={16} className="text-[#0052cc]" />
        <h3 className="text-[13px] font-bold text-[#191c1e] uppercase tracking-wider">
          Regulatory & Industry Standards
        </h3>
        <span className="ml-auto text-[12px] font-bold bg-[#F4F5F7] text-[#434654] px-2 py-0.5 rounded-sm border border-[#DFE1E6] tabular-nums">
          {evidenceMatches.length} Rule{evidenceMatches.length !== 1 ? 's' : ''}
        </span>
      </div>

      {evidenceMatches.map((chunk, idx) => {
        const src = SOURCE_CONFIG[chunk.source] || {
          icon: '📄',
          color: 'border-[#DFE1E6] bg-[#ffffff]',
          headerColor: 'text-[#191c1e]',
          badgeColor: 'bg-[#F4F5F7] text-[#434654] border border-[#DFE1E6]',
          label: chunk.source_label || chunk.source,
        }

        const maxLen = 450
        const displayText =
          chunk.text.length > maxLen
            ? chunk.text.substring(0, maxLen) + '…'
            : chunk.text

        return (
          <div
            key={`${chunk.chunk_id}-${idx}`}
            className={`rounded-lg p-3.5 ${src.color} border bg-white fade-in shadow-sm`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-2">
                <span>{src.icon}</span>
                <span className={`text-[13px] font-bold ${src.headerColor}`}>
                  {src.label}
                </span>
              </div>
              {chunk.metadata?.section && (
                <span className={`text-[11px] px-2 py-0.5 rounded-sm font-semibold ${src.badgeColor}`}>
                  {chunk.metadata.section.length > 35
                    ? chunk.metadata.section.substring(0, 35) + '…'
                    : chunk.metadata.section}
                </span>
              )}
            </div>

            {/* Evidence Text */}
            <p className="text-[13px] text-[#434654] leading-relaxed bg-[#F4F5F7] rounded-md p-2.5 border border-[#DFE1E6]">
              {displayText}
            </p>

            {/* Similarity Meter */}
            <SimilarityMeter score={chunk.similarity_score} />
          </div>
        )
      })}
    </div>
  )
}
