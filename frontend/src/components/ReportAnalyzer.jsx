import { useState } from 'react'
import { Send, AlertCircle, Loader2, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react'
import { analyzeText } from '../api/client'

const SAMPLE_REPORTS = [
  {
    label: '🔴 [R] Structural Pin Removal Trajectory (AHWR-50-04)',
    functional_location: 'AHWR-50-04 Work Over Rig (50MT)',
    item_no: '00001',
    incident_type: 'Near Miss',
    incident_sub_type: 'Near Miss – High Potential',
    incident_cause: 'IMPROPER MATERIAL HANDLING',
    ehs_code: 'R',
    affected_person_type: 'Contractor Worker',
    designation: 'Rigman',
    root_cause_analysis: 'UNAWARENESS OF RIGMAN STANDING EXACT OPPOSITE TO DIRECTION OF BLOW.',
    potential_consequences: 'IT COULD HAVE HIT ANYWHERE RESULTING TO MINOR TO MAJOR INJURY.',
    corrective_action: 'INSTRUCTED ALL CREW MEMBERS TO WORK SAFELY.',
    preventive_action: '1. DON\'T HOLD PIN WHEN HAMMERING. 2. IF REQUIRED TO HOLD, THEN STAND AND HOLD AWAY FROM THE POSSIBLE OUT DIRECTION OF BLOW.',
    text: 'DURING REMOVING PIN FROM A STRUCTURE, ONE RIGMAN HAMMERED THE PIN TO REMOVE IT AND IT CAME OUT AT SPEED PASSING NEARBY TO THE RIGMAN HOLDING THE PIN STANDING OPPOSITE TO IT.',
  },
  {
    label: '🔴 [M] Line Testing Joint Hammering Slip (AHWR-50-04)',
    functional_location: 'AHWR-50-04 Work Over Rig (50MT)',
    item_no: '00001',
    incident_type: 'Near Miss',
    incident_sub_type: 'Near Miss',
    incident_cause: 'IMPROPER MATERIAL HANDLING',
    ehs_code: 'M',
    affected_person_type: 'Contractor Worker',
    designation: 'Joint Tester',
    root_cause_analysis: 'DUE TO THE CARELESSNESS OF THE PERSON.',
    potential_consequences: 'IT MAY HIT PERSONS STANDING NEARBY AND CAUSE SERIOUS INJURY.',
    corrective_action: 'INSTRUCTED ALL CREW MEMBERS TO WORK SAFELY WITH WEARING FULL PPE.',
    preventive_action: 'ENSURE MANUAL IMPACT TOOLS ARE TETHERED AND DROP ZONE BARRICADED.',
    text: 'DURING LINE TESTING, ONE PERSON WAS TIGHTENING THE JOINT WITH HAMMER. SUDDENLY THE HAMMER GOT SLIPPED FROM HIS HAND AND FELL DOWN ON THE GROUND. LUCKILY NO ONE GOT INJURED.',
  },
  {
    label: '🟡 [V] Derrick Floor Eyewash Station (AHWR-50-04)',
    functional_location: 'AHWR-50-04 Work Over Rig (50MT)',
    item_no: '00001',
    incident_type: 'Unsafe Condition',
    incident_sub_type: 'UNSAFE WORKING CONDITION',
    incident_cause: 'UNSAFE WORKING CONDITION',
    ehs_code: 'V',
    affected_person_type: 'Employee',
    designation: 'Derrickman',
    root_cause_analysis: 'IMPROPER SUPERVISION.',
    potential_consequences: 'DELAYED EYE FLUSHING DURING CHEMICAL OR MUD SPLASH.',
    corrective_action: 'IMMEDIATELY CLEAN THE EYEWASH AND FILLED WITH WATER PROPERLY.',
    preventive_action: 'ALWAYS KEEP THE EYEWASH FILLED WITH CLEANED WATER AT DERRICK FLOOR AND AT CHEMICAL STORES.',
    text: 'DURING ROUTINE CHECKUP, IT WAS OBSERVED THAT EYEWASH FITTED AT THE DERRICK FLOOR WAS PROPERLY FILLED WITH WATER.',
  },
  {
    label: '🔴 [R] Pressure Bleed Depressurization (Rig-04)',
    functional_location: 'Rig-04 Production Manifold',
    item_no: '00002',
    incident_type: 'Unsafe Act',
    incident_sub_type: 'Energy Isolation Gap',
    incident_cause: 'NON ADHERENCE TO SOP',
    ehs_code: 'R',
    affected_person_type: 'Operator',
    designation: 'Manifold Operator',
    root_cause_analysis: 'Secondary isolation valve B status was left unverified during pressure bleed.',
    potential_consequences: 'Premature energy release / SIF Blowout potential.',
    corrective_action: 'Physically verify and document double block isolation.',
    preventive_action: 'Enforce DBB checklist before opening bleed valves.',
    text: 'During morning shift, Valve A on the Rig-04 manifold was opened to bleed surface pressure as per workover schedule. Pressure gauge dropped from 210 bar to near-zero over approximately 15 minutes. Operation was completed without incident. Crew proceeded to change the manifold spool piece following the bleed-down.',
  },
]

export default function ReportAnalyzer({ onAnalysisComplete }) {
  const [showFullForm, setShowFullForm] = useState(false)
  const [text, setText] = useState('')
  const [functionalLocation, setFunctionalLocation] = useState('AHWR-50-04 Work Over Rig (50MT)')
  const [itemNo, setItemNo] = useState('00001')
  const [incidentType, setIncidentType] = useState('Near Miss')
  const [incidentCause, setIncidentCause] = useState('IMPROPER MATERIAL HANDLING')
  const [ehsCode, setEhsCode] = useState('R')
  const [affectedPersonType, setAffectedPersonType] = useState('Contractor Worker')
  const [designation, setDesignation] = useState('Rigman')
  const [rootCauseAnalysis, setRootCauseAnalysis] = useState('')
  const [potentialConsequences, setPotentialConsequences] = useState('')
  const [correctiveAction, setCorrectiveAction] = useState('')
  const [preventiveAction, setPreventiveAction] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAnalyze = async () => {
    const trimmed = text.trim()
    if (!trimmed || trimmed.length < 10) {
      setError('Please enter a valid report narrative (minimum 10 characters).')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const payload = {
        text: trimmed,
        functional_location: functionalLocation,
        item_no: itemNo,
        incident_type: incidentType,
        incident_cause: incidentCause,
        ehs_code: ehsCode,
        affected_person_type: affectedPersonType,
        designation: designation,
        root_cause_analysis: rootCauseAnalysis,
        potential_consequences: potentialConsequences,
        corrective_action: correctiveAction,
        preventive_action: preventiveAction,
      }

      // Send to analyze endpoint
      const result = await analyzeText(payload.text)
      // Merge structured fields
      Object.assign(result, payload)

      onAnalysisComplete(result)
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        'Analysis failed. Is the backend running?'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleSampleLoad = (s) => {
    setText(s.text)
    setFunctionalLocation(s.functional_location || 'AHWR-50-04 Work Over Rig (50MT)')
    setItemNo(s.item_no || '00001')
    setIncidentType(s.incident_type || 'Near Miss')
    setIncidentCause(s.incident_cause || 'IMPROPER MATERIAL HANDLING')
    setEhsCode(s.ehs_code || 'R')
    setAffectedPersonType(s.affected_person_type || 'Contractor Worker')
    setDesignation(s.designation || 'Rigman')
    setRootCauseAnalysis(s.root_cause_analysis || '')
    setPotentialConsequences(s.potential_consequences || '')
    setCorrectiveAction(s.corrective_action || '')
    setPreventiveAction(s.preventive_action || '')
    setError(null)
  }

  return (
    <div className="space-y-4">
      {/* Sample Selector */}
      <div>
        <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">
          Quick Load Real SAP EHS Report Cases
        </p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_REPORTS.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSampleLoad(s)}
              className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full border border-slate-700 hover:border-slate-500 transition-colors font-medium"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Form Box */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-4">
        {/* Toggle Full Form */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-blue-400" size={18} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              SAP EHS Incident Form Input
            </h3>
          </div>
          <button
            onClick={() => setShowFullForm(!showFullForm)}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold"
          >
            {showFullForm ? (
              <>
                Hide Full Structured Fields <ChevronUp size={14} />
              </>
            ) : (
              <>
                Expand Full SAP EHS Form Fields <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>

        {/* Expandable SAP Fields */}
        {showFullForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-3 border-t border-slate-800">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Functional Location</label>
              <input
                type="text"
                value={functionalLocation}
                onChange={(e) => setFunctionalLocation(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">SAP EHS Category Code</label>
              <select
                value={ehsCode}
                onChange={(e) => setEhsCode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-amber-300 font-mono"
              >
                <option value="R">R — Near Miss - High Potential (HIPO)</option>
                <option value="M">M — Near Miss</option>
                <option value="V">V — Unsafe Condition</option>
                <option value="U">U — Unsafe Act</option>
                <option value="G">G — Gas Release</option>
                <option value="F">F — Fire without loss of property</option>
                <option value="W">W — Fire with loss of property</option>
                <option value="P">P — 2 Phase Release</option>
                <option value="N">N — Nil Report</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Incident Cause</label>
              <input
                type="text"
                value={incidentCause}
                onChange={(e) => setIncidentCause(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Affected Person / Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-400 font-semibold mb-1">Root Cause Analysis</label>
              <input
                type="text"
                value={rootCauseAnalysis}
                onChange={(e) => setRootCauseAnalysis(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
              />
            </div>

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-emerald-400 font-semibold mb-1">Corrective Action Taken</label>
                <input
                  type="text"
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-blue-400 font-semibold mb-1">Preventive Action Required</label>
                <input
                  type="text"
                  value={preventiveAction}
                  onChange={(e) => setPreventiveAction(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
                />
              </div>
            </div>
          </div>
        )}

        {/* Textarea */}
        <div>
          <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">
            Field Incident Brief Summary / Narrative
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type raw safety incident report narrative..."
            rows={5}
            className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-500 resize-none outline-none font-mono leading-relaxed"
          />
          <div className="text-right text-xs text-slate-600 mt-1">{text.length} chars</div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-300">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={handleAnalyze}
          disabled={loading || !text.trim()}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Executing Multi-Model Causal Pipeline...
            </>
          ) : (
            <>
              <Send size={16} />
              Run SIF Risk & Causal Graph Analysis
            </>
          )}
        </button>
      </div>
    </div>
  )
}
