import { BookOpen } from 'lucide-react'

const SOURCE_CONFIG = {
  iogp_rules: {
    icon: '📋',
    color: 'border-indigo-200 bg-indigo-50/70',
    headerColor: 'text-indigo-900',
    badgeColor: 'bg-indigo-100 text-indigo-900 border border-indigo-200',
    label: 'IOGP Safety Standards',
  },
  oisd_guidelines: {
    icon: '📐',
    color: 'border-purple-200 bg-purple-50/70',
    headerColor: 'text-purple-900',
    badgeColor: 'bg-purple-100 text-purple-900 border border-purple-200',
    label: 'OISD Process Safety Rules',
  },
  baghjan_investigation: {
    icon: '🔥',
    color: 'border-amber-200 bg-amber-50/70',
    headerColor: 'text-amber-900',
    badgeColor: 'bg-amber-100 text-amber-900 border border-amber-200',
    label: 'Industry Case Reference',
  },
}

function SimilarityMeter({ score }) {
  const pct = Math.round(score * 100)
  const color =
    score >= 0.7 ? 'bg-emerald-500' : score >= 0.5 ? 'bg-indigo-500' : 'bg-slate-400'
  const textColor =
    score >= 0.7 ? 'text-emerald-700' : score >= 0.5 ? 'text-indigo-700' : 'text-slate-600'

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60">
      <span className="text-xs text-slate-500 font-semibold">Rule Relevance</span>
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-bold ${textColor} tabular-nums`}>
        {pct}%
      </span>
    </div>
  )
}

export default function GroundingPanel({ evidenceMatches }) {
  if (!evidenceMatches || evidenceMatches.length === 0) {
    return (
      <div className="p-5 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200 shadow-2xs">
        <BookOpen size={20} className="mx-auto mb-2 text-slate-300" />
        No regulatory evidence matches retrieved.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen size={16} className="text-indigo-600" />
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Regulatory & Industry Standards</h3>
        <span className="ml-auto text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 tabular-nums">
          {evidenceMatches.length} Rule{evidenceMatches.length !== 1 ? 's' : ''} Matched
        </span>
      </div>

      {evidenceMatches.map((chunk, idx) => {
        const src = SOURCE_CONFIG[chunk.source] || {
          icon: '📄',
          color: 'border-slate-200 bg-slate-50',
          headerColor: 'text-slate-800',
          badgeColor: 'bg-slate-100 text-slate-700 border border-slate-200',
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
            className={`rounded-xl p-3.5 ${src.color} border shadow-2xs fade-in`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-2">
                <span>{src.icon}</span>
                <span className={`text-xs font-extrabold ${src.headerColor}`}>
                  {src.label}
                </span>
              </div>
              {chunk.metadata?.section && (
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${src.badgeColor}`}>
                  {chunk.metadata.section.length > 35
                    ? chunk.metadata.section.substring(0, 35) + '…'
                    : chunk.metadata.section}
                </span>
              )}
            </div>

            {/* Evidence text */}
            <p className="text-xs text-slate-800 leading-relaxed font-sans bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs font-medium">
              {displayText}
            </p>

            {/* Similarity meter */}
            <SimilarityMeter score={chunk.similarity_score} />
          </div>
        )
      })}
    </div>
  )
}
