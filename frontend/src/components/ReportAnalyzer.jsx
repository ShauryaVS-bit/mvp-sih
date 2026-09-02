import { useState } from 'react'
import { Send, AlertCircle, Loader2, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react'
import { analyzeText } from '../api/client'

const SAMPLE_REPORTS = [
  {
    label: '🔴 Structural Pin Removal Trajectory',
    functional_location: 'AHWR-50-04 Work Over Rig (50MT)',
    item_no: '00001',
    incident_type: 'Near Miss',
    incident_sub_type: 'Near Miss – High Potential',
    incident_cause: 'IMPROPER MATERIAL HANDLING',
    ehs_code: 'R',
    affected_person_type: 'Contractor Worker',
    designation: 'Rigman',
    root_cause_analysis: 'Unawareness of rigman standing opposite to direction of blow.',
    potential_consequences: 'Could have resulted in minor or major injury.',
    corrective_action: 'Instructed crew to stand clear of hammer trajectory.',
    preventive_action: '1. Do not hold pin during hammering. 2. Use holding tongs when required.',
    text: 'DURING REMOVING PIN FROM A STRUCTURE, ONE RIGMAN HAMMERED THE PIN TO REMOVE IT AND IT CAME OUT AT SPEED PASSING NEARBY TO THE RIGMAN HOLDING THE PIN STANDING OPPOSITE TO IT.',
  },
  {
    label: '🔴 Line Testing Joint Hammering Slip',
    functional_location: 'AHWR-50-04 Work Over Rig (50MT)',
    item_no: '00001',
    incident_type: 'Near Miss',
    incident_sub_type: 'Near Miss',
    incident_cause: 'IMPROPER MATERIAL HANDLING',
    ehs_code: 'M',
    affected_person_type: 'Contractor Worker',
    designation: 'Joint Tester',
    root_cause_analysis: 'Loss of tool grip during manual striking.',
    potential_consequences: 'Potential impact to personnel nearby.',
    corrective_action: 'Enforced tethered tool requirement.',
    preventive_action: 'Ensure manual impact tools are tethered and drop zone barricaded.',
    text: 'DURING LINE TESTING, ONE PERSON WAS TIGHTENING THE JOINT WITH HAMMER. SUDDENLY THE HAMMER GOT SLIPPED FROM HIS HAND AND FELL DOWN ON THE GROUND. LUCKILY NO ONE GOT INJURED.',
  },
  {
    label: '🟡 Derrick Floor Eyewash Inspection',
    functional_location: 'AHWR-50-04 Work Over Rig (50MT)',
    item_no: '00001',
    incident_type: 'Unsafe Condition',
    incident_sub_type: 'UNSAFE WORKING CONDITION',
    incident_cause: 'UNSAFE WORKING CONDITION',
    ehs_code: 'V',
    affected_person_type: 'Employee',
    designation: 'Derrickman',
    root_cause_analysis: 'Routine checkup verification.',
    potential_consequences: 'Delayed flushing during chemical splash.',
    corrective_action: 'Verified fluid level in eyewash unit.',
    preventive_action: 'Keep eyewash filled with clean water at derrick floor and chemical stores.',
    text: 'DURING ROUTINE CHECKUP, IT WAS OBSERVED THAT EYEWASH FITTED AT THE DERRICK FLOOR WAS PROPERLY FILLED WITH WATER.',
  },
  {
    label: '🔴 Pressure Bleed Isolation Gap',
    functional_location: 'Rig-04 Production Manifold',
    item_no: '00002',
    incident_type: 'Unsafe Act',
    incident_sub_type: 'Energy Isolation Gap',
    incident_cause: 'NON ADHERENCE TO SOP',
    ehs_code: 'R',
    affected_person_type: 'Operator',
    designation: 'Manifold Operator',
    root_cause_analysis: 'Secondary isolation valve B status was left unverified during pressure bleed.',
    potential_consequences: 'Premature energy release potential.',
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

      const result = await analyzeText(payload.text)
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
    <div className="space-y-4 font-inter">
      {/* Sample Selector */}
      <div className="bg-white p-5 rounded-lg border border-[#DFE1E6] shadow-sm">
        <p className="text-[13px] text-[#191c1e] font-bold mb-3">
          Quick Load Field Incident Narratives
        </p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_REPORTS.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSampleLoad(s)}
              className="text-[12px] px-3 py-1.5 bg-[#F4F5F7] hover:bg-[#e1e2e4] text-[#191c1e] rounded-sm border border-[#DFE1E6] transition-all font-semibold active:scale-[0.98]"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Form Box */}
      <div className="bg-white border border-[#DFE1E6] rounded-lg p-5 shadow-sm space-y-5">
        {/* Toggle Full Form */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-[#0052cc]" size={18} />
            <h3 className="text-[14px] font-bold text-[#191c1e] uppercase tracking-wider">
              Incident Metadata & Attributes
            </h3>
          </div>
          <button
            onClick={() => setShowFullForm(!showFullForm)}
            className="flex items-center gap-1 text-[12px] text-[#0052cc] hover:text-[#003d9b] font-bold transition-colors active:scale-[0.98]"
          >
            {showFullForm ? (
              <>
                Hide Metadata Fields <ChevronUp size={14} />
              </>
            ) : (
              <>
                Expand Metadata Fields <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>

        {/* Expandable Fields */}
        {showFullForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-[13px] pt-4 border-t border-[#DFE1E6]">
            <div>
              <label className="block text-[#434654] font-semibold mb-1.5">Functional Location</label>
              <input
                type="text"
                value={functionalLocation}
                onChange={(e) => setFunctionalLocation(e.target.value)}
                className="corp-input w-full px-3 py-2 text-[#191c1e] font-semibold"
              />
            </div>

            <div>
              <label className="block text-[#434654] font-semibold mb-1.5">Incident EHS Code</label>
              <select
                value={ehsCode}
                onChange={(e) => setEhsCode(e.target.value)}
                className="corp-input w-full px-3 py-2 text-[#0052cc] font-bold bg-[#F4F5F7]"
              >
                <option value="R">R - Near Miss High Potential</option>
                <option value="M">M - Near Miss Standard</option>
                <option value="V">V - Unsafe Condition</option>
                <option value="U">U - Unsafe Act</option>
                <option value="G">G - Gas Release</option>
                <option value="F">F - Fire without Property Loss</option>
                <option value="W">W - Fire with Property Loss</option>
                <option value="P">P - Process Release</option>
              </select>
            </div>

            <div>
              <label className="block text-[#434654] font-semibold mb-1.5">Incident Cause</label>
              <input
                type="text"
                value={incidentCause}
                onChange={(e) => setIncidentCause(e.target.value)}
                className="corp-input w-full px-3 py-2 text-[#191c1e]"
              />
            </div>

            <div>
              <label className="block text-[#434654] font-semibold mb-1.5">Affected Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="corp-input w-full px-3 py-2 text-[#191c1e]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[#434654] font-semibold mb-1.5">Root Cause Category</label>
              <input
                type="text"
                value={rootCauseAnalysis}
                onChange={(e) => setRootCauseAnalysis(e.target.value)}
                className="corp-input w-full px-3 py-2 text-[#191c1e]"
              />
            </div>

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#006d35] font-semibold mb-1.5">Corrective Action Taken</label>
                <input
                  type="text"
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  className="corp-input w-full px-3 py-2 text-[#005226] bg-[#d1fae5] border-[#a7f3d0]"
                />
              </div>
              <div>
                <label className="block text-[#0052cc] font-semibold mb-1.5">Preventive Action Required</label>
                <input
                  type="text"
                  value={preventiveAction}
                  onChange={(e) => setPreventiveAction(e.target.value)}
                  className="corp-input w-full px-3 py-2 text-[#0040a2] bg-[#eff4ff] border-[#c4d2ff]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Textarea */}
        <div>
          <label className="block text-[13px] font-bold text-[#191c1e] mb-1.5">
            Field Observation & Incident Narrative
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type field observation report narrative..."
            rows={5}
            className="corp-input w-full p-3.5 text-[13px] text-[#191c1e] placeholder-[#737685] resize-none leading-relaxed font-medium"
          />
          <div className="text-right text-[11px] font-semibold text-[#576377] mt-1 tabular-nums">{text.length} characters</div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-[#ffdad6] border border-[#ffb4ab] rounded-md text-[13px] font-semibold text-[#93000a]">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-[#ba1a1a]" />
            {error}
          </div>
        )}

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={loading || !text.trim()}
          className={`flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 text-[13px] font-bold rounded-sm transition-all active:scale-[0.98] ${
            loading || !text.trim()
              ? 'bg-[#F4F5F7] text-[#576377] border border-[#DFE1E6] cursor-not-allowed'
              : 'corp-button-primary border border-transparent'
          }`}
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              EVALUATING SIF HAZARDS & RULES...
            </>
          ) : (
            <>
              <Send size={14} />
              RUN INCIDENT RISK ANALYSIS
            </>
          )}
        </button>
      </div>
    </div>
  )
}
