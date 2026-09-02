import { BookOpen, ExternalLink } from 'lucide-react'

const SOURCE_CONFIG = {
  iogp_rules: {
    icon: '📋',
    color: 'border-blue-500 bg-blue-900/20',
    headerColor: 'text-blue-300',
    badgeColor: 'bg-blue-800/60 text-blue-200',
    label: 'IOGP Life-Saving Rules',
  },
  oisd_guidelines: {
    icon: '📐',
    color: 'border-purple-500 bg-purple-900/20',
    headerColor: 'text-purple-300',
    badgeColor: 'bg-purple-800/60 text-purple-200',
    label: 'OISD Process Safety Standards',
  },
  baghjan_investigation: {
    icon: '🔥',
    color: 'border-orange-500 bg-orange-900/20',
    headerColor: 'text-orange-300',
    badgeColor: 'bg-orange-800/60 text-orange-200',
    label: 'Baghjan-5 Case Study (2020)',
  },
}

function SimilarityMeter({ score }) {
  const pct = Math.round(score * 100)
  const color =
    score >= 0.7 ? 'bg-emerald-500' : score >= 0.5 ? 'bg-blue-400' : 'bg-slate-400'
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-slate-500">Relevance</span>
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-semibold ${color.replace('bg-', 'text-')}`}>
        {pct}%
      </span>
    </div>
  )
}

export default function GroundingPanel({ evidenceMatches }) {
  if (!evidenceMatches || evidenceMatches.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm bg-slate-800/30 rounded-lg border border-slate-700">
        <BookOpen size={20} className="mx-auto mb-2 text-slate-600" />
        No evidence retrieved yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen size={16} className="text-blue-400" />
        <h3 className="text-sm font-semibold text-white">📘 Grounding Evidence</h3>
        <span className="ml-auto text-xs text-slate-400">
          {evidenceMatches.length} match{evidenceMatches.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {evidenceMatches.map((chunk, idx) => {
        const src = SOURCE_CONFIG[chunk.source] || {
          icon: '📄',
          color: 'border-slate-500 bg-slate-800/30',
          headerColor: 'text-slate-300',
          badgeColor: 'bg-slate-700 text-slate-300',
          label: chunk.source_label || chunk.source,
        }

        // Truncate long evidence text
        const maxLen = 450
        const displayText =
          chunk.text.length > maxLen
            ? chunk.text.substring(0, maxLen) + '…'
            : chunk.text

        return (
          <div
            key={`${chunk.chunk_id}-${idx}`}
            className={`rounded-lg border-l-4 p-3 ${src.color} fade-in`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span>{src.icon}</span>
                <span className={`text-xs font-semibold ${src.headerColor}`}>
                  {src.label}
                </span>
              </div>
              {chunk.metadata?.section && (
                <span className={`text-xs px-2 py-0.5 rounded ${src.badgeColor}`}>
                  {chunk.metadata.section.length > 40
                    ? chunk.metadata.section.substring(0, 40) + '…'
                    : chunk.metadata.section}
                </span>
              )}
            </div>

            {/* Evidence text */}
            <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-900/40 rounded p-2 border border-slate-700/50">
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
