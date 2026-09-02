import React, { useState, useEffect } from 'react';
import ReportGraph from './ReportGraph';
import { fetchLinkedReports } from '../api/client';

export default function ReportDetail({ report, analysis, analysisLoading, onNavigate, onSelectReport }) {
  const [linkedView, setLinkedView] = useState('list'); // 'list' | 'graph'
  const [graphData, setGraphData] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);

  // Fetch linked reports when switching to graph view or when report changes
  useEffect(() => {
    if (!report?.report_id) return;
    
    setGraphLoading(true);
    fetchLinkedReports(report.report_id)
      .then(data => {
        setGraphData(data);
        setGraphLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch linked reports:', err);
        setGraphData(null);
        setGraphLoading(false);
      });
  }, [report?.report_id]);

  const handleGraphNodeClick = (reportId) => {
    if (reportId !== report?.report_id && onSelectReport) {
      onSelectReport(reportId);
    }
  };

  // Build list items from graphData edges for the list view
  const linkedReports = graphData?.edges?.map(edge => {
    const targetNode = graphData.nodes.find(n => n.id === edge.target);
    return targetNode ? { ...targetNode, reasons: edge.reasons, strength: edge.strength, label_short: edge.label } : null;
  }).filter(Boolean) || [];

  return (
    <>
      
{/* TopNavBar */}
<header className="bg-surface-container-lowest border-b border-outline-variant fixed top-0 left-0 w-full z-50 flex justify-between items-center px-container-padding h-row-height-standard">
<div className="flex items-center gap-gutter">
<div className="font-display-lg text-display-lg font-bold text-primary">OIL Sentinel</div>
</div>
<nav className="hidden md:flex items-center h-full gap-8">
<a onClick={() => onNavigate('DASHBOARD')} className="text-on-surface-variant font-body-md text-body-md h-full flex items-center border-b-2 border-transparent hover:bg-surface-container transition-colors px-2 cursor-pointer active:opacity-80">Dashboard</a>
<a onClick={() => onNavigate('UPLOAD')} className="text-on-surface-variant font-body-md text-body-md h-full flex items-center border-b-2 border-transparent hover:bg-surface-container transition-colors px-2 cursor-pointer active:opacity-80">New Report</a>
</nav>
<div className="flex items-center gap-4 text-primary">
<button className="hover:bg-surface-container p-2 rounded transition-colors cursor-pointer active:opacity-80">
<span className="material-symbols-outlined" data-icon="notifications">notifications</span>
</button>
<button className="hover:bg-surface-container p-2 rounded transition-colors cursor-pointer active:opacity-80">
<span className="material-symbols-outlined" data-icon="account_circle">account_circle</span>
</button>
</div>
</header>

{/* Main Content */}
<main className="pt-[calc(48px+24px)] px-container-padding pb-container-padding flex-grow flex flex-col">
<div className="w-full">

{/* Breadcrumb / Back */}
<a onClick={() => onNavigate('DASHBOARD')} className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary mb-6 transition-colors cursor-pointer">
<span className="material-symbols-outlined text-[18px]" data-icon="chevron_left">chevron_left</span>
<span className="font-body-sm text-body-sm">Back to Dashboard</span>
</a>

<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

{/* Left Column: Main Report Document */}
<div className="lg:col-span-8 space-y-6">

{/* Header Block */}
<div className="bg-surface-container-lowest border border-outline-variant rounded p-6">
<div className="flex flex-wrap items-start justify-between gap-4 mb-4">
<div>
<div className="flex items-center gap-3 mb-2">
{report?.risk_level === 'HIGH' && report?.sif_potential ? (
  <span className="inline-block bg-error text-white font-label-caps text-label-caps px-2 py-1 rounded">CRITICAL</span>
) : report?.risk_level === 'HIGH' ? (
  <span className="inline-block bg-[#d97706] text-white font-label-caps text-label-caps px-2 py-1 rounded">HIGH</span>
) : report?.risk_level === 'MEDIUM' ? (
  <span className="inline-block bg-[#65a30d] text-white font-label-caps text-label-caps px-2 py-1 rounded">MODERATE</span>
) : report?.risk_level === 'LOW' ? (
  <span className="inline-block bg-[#3b82f6] text-white font-label-caps text-label-caps px-2 py-1 rounded">LOW</span>
) : (
  <span className="inline-block bg-surface-container-high text-on-surface-variant font-label-caps text-label-caps px-2 py-1 rounded">PENDING</span>
)}
<span className="font-label-caps text-label-caps text-on-surface-variant">{report?.report_id || 'N/A'}</span>
</div>
<h1 className="font-headline-md text-headline-md text-on-surface">Incident Report Details</h1>
</div>
<div className="text-right">
<div className="font-data-tabular text-data-tabular text-on-surface-variant">{report?.timestamp || '—'}</div>
<div className="font-data-tabular text-data-tabular text-on-surface-variant mt-1">Site: {report?.site || report?.functional_location || '—'}</div>
</div>
</div>
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-outline-variant">
<div>
<div className="font-label-caps text-label-caps text-on-surface-variant mb-1">CATEGORY</div>
<div className="font-body-sm text-body-sm text-on-surface">{report?.category || '—'}</div>
</div>
<div>
<div className="font-label-caps text-label-caps text-on-surface-variant mb-1">CAUSE</div>
<div className="font-body-sm text-body-sm text-on-surface">{report?.incident_cause || analysis?.incident_cause || '—'}</div>
</div>
<div>
<div className="font-label-caps text-label-caps text-on-surface-variant mb-1">EHS CODE</div>
<div className="font-body-sm text-body-sm text-on-surface">{analysis?.ehs_code || '—'} — {analysis?.ehs_short_desc || ''}</div>
</div>
<div>
<div className="font-label-caps text-label-caps text-on-surface-variant mb-1">SIF POTENTIAL</div>
<div className="font-body-sm text-body-sm text-on-surface flex items-center gap-1">
{(report?.sif_potential || analysis?.sif_potential) ? (
  <><span className="w-2 h-2 rounded-full bg-error animate-pulse"></span> Confirmed</>
) : (
  <><span className="w-2 h-2 rounded-full bg-secondary"></span> Not flagged</>
)}
</div>
</div>
</div>
</div>

{/* Content Section */}
<div className="bg-surface-container-lowest border border-outline-variant rounded overflow-hidden">
<div className="h-1 bg-primary w-full"></div>
<div className="p-6 space-y-8">

{/* Description */}
<section>
<h2 className="font-headline-sm text-headline-sm text-on-surface mb-3 flex items-center gap-2">
<span className="material-symbols-outlined text-[20px]">notes</span>
Description of the Incident
</h2>
<p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
{report?.preview || analysis?.raw_text || 'No description available.'}
</p>
</section>

{/* Loading indicator */}
{analysisLoading && (
<div className="flex items-center gap-3 py-6 text-on-surface-variant">
  <span className="material-symbols-outlined animate-spin text-primary">sync</span>
  <span className="font-body-sm text-body-sm">Running NLP pipeline — extracting facts, inferring hazards, retrieving evidence...</span>
</div>
)}
{analysis?.extracted_facts && analysis.extracted_facts.length > 0 && (
<>
<hr className="border-outline-variant" />
<section>
<h2 className="font-headline-sm text-headline-sm text-on-surface mb-3 flex items-center gap-2">
<span className="material-symbols-outlined text-[20px]">fact_check</span>
Extracted Facts ({analysis.extracted_facts.length})
</h2>
<ul className="list-none space-y-2">
{analysis.extracted_facts.map((fact, i) => (
<li key={i} className="flex items-start gap-2 bg-surface p-3 rounded border border-outline-variant">
<span className="material-symbols-outlined text-[16px] text-primary mt-0.5">label</span>
<div>
<div className="font-body-sm text-body-sm font-semibold text-on-surface">
{fact.entity} → {fact.action} → {fact.state}
</div>
<div className="font-body-sm text-body-sm text-on-surface-variant">
{fact.location !== 'unspecified' && <span>Location: {fact.location} · </span>}
Confidence: {Math.round(fact.confidence * 100)}%
{fact.triggered_rule_id && <span> · Rule: {fact.triggered_rule_id}</span>}
</div>
</div>
</li>
))}
</ul>
</section>
</>
)}

{/* Inferred Hazards */}
{analysis?.inferred_hazards && analysis.inferred_hazards.length > 0 && (
<>
<hr className="border-outline-variant" />
<section>
<h2 className="font-headline-sm text-headline-sm text-on-surface mb-3 flex items-center gap-2">
<span className="material-symbols-outlined text-[20px]">warning</span>
Inferred Hazards ({analysis.inferred_hazards.length})
</h2>
<ul className="list-none space-y-2">
{analysis.inferred_hazards.map((hz, i) => (
<li key={i} className="bg-surface p-4 rounded border border-outline-variant">
<div className="flex items-center gap-2 mb-2">
<span className={`material-symbols-outlined text-[16px] ${hz.sif_potential ? 'text-error' : 'text-primary'}`}>
{hz.sif_potential ? 'error' : 'info'}
</span>
<span className="font-body-sm text-body-sm font-bold text-on-surface">{hz.hazard_tag}</span>
<span className="font-data-tabular text-data-tabular text-on-surface-variant ml-auto">
Severity: {Math.round(hz.severity_score * 100)}%
</span>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant mb-2">{hz.hazard_description}</p>
<div className="grid grid-cols-2 gap-2 mt-2">
<div>
<span className="font-label-caps text-label-caps text-on-surface-variant">IOGP RULE</span>
<div className="font-body-sm text-body-sm text-on-surface">{hz.iogp_rule}</div>
</div>
<div>
<span className="font-label-caps text-label-caps text-on-surface-variant">OISD STD</span>
<div className="font-body-sm text-body-sm text-on-surface">{hz.oisd_standard}</div>
</div>
</div>
{hz.inferred_gap && (
<div className="mt-2 font-body-sm text-body-sm text-error bg-error-container px-2 py-1 rounded">
Gap: {hz.inferred_gap}
</div>
)}
</li>
))}
</ul>
</section>
</>
)}

{/* Corrective & Preventive Actions */}
{(analysis?.corrective_action || analysis?.preventive_action) && (
<>
<hr className="border-outline-variant" />
<section>
<h2 className="font-headline-sm text-headline-sm text-on-surface mb-3 flex items-center gap-2">
<span className="material-symbols-outlined text-[20px]">build</span>
Actions
</h2>
<div className="space-y-3">
{analysis.corrective_action && (
<div className="bg-surface p-3 rounded border border-outline-variant">
<div className="font-label-caps text-label-caps text-on-surface-variant mb-1">CORRECTIVE ACTION</div>
<div className="font-body-sm text-body-sm text-on-surface">{analysis.corrective_action}</div>
</div>
)}
{analysis.preventive_action && (
<div className="bg-surface p-3 rounded border border-outline-variant">
<div className="font-label-caps text-label-caps text-on-surface-variant mb-1">PREVENTIVE ACTION</div>
<div className="font-body-sm text-body-sm text-on-surface">{analysis.preventive_action}</div>
</div>
)}
</div>
</section>
</>
)}

</div>
</div>
</div>

{/* Right Column: Context & Linking */}
<div className="lg:col-span-4 space-y-6">

{/* Risk Summary */}
{analysis && (
<div className="bg-surface-container-lowest border border-outline-variant rounded p-5">
<h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">Risk Assessment</h3>
<div className="space-y-3">

{analysis.fact_tuple && (
<div>
<div className="font-label-caps text-label-caps text-on-surface-variant mb-1">5-TUPLE EXTRACTION</div>
<div className="space-y-1 font-body-sm text-body-sm text-on-surface-variant">
<div><span className="text-on-surface font-medium">Activity:</span> {analysis.fact_tuple.activity}</div>
<div><span className="text-on-surface font-medium">Equipment:</span> {analysis.fact_tuple.equipment}</div>
<div><span className="text-on-surface font-medium">Hazard:</span> {analysis.fact_tuple.hazard}</div>
<div><span className="text-on-surface font-medium">Energy:</span> {analysis.fact_tuple.energy_source}</div>
<div><span className="text-on-surface font-medium">Exposure:</span> {analysis.fact_tuple.exposure}</div>
</div>
</div>
)}
</div>
</div>
)}

{/* Linked Reports — List/Graph toggle */}
<div className="bg-surface-container-lowest border border-outline-variant rounded p-5 flex flex-col" style={{ height: linkedView === 'graph' ? '450px' : 'auto', minHeight: '300px' }}>
<div className="flex items-center justify-between mb-4">
<h3 className="font-headline-sm text-headline-sm text-on-surface">
  Linked Reports
  {graphData?.total_linked > 0 && (
    <span className="font-data-tabular text-data-tabular text-on-surface-variant ml-2">({graphData.total_linked})</span>
  )}
</h3>
<div className="flex bg-surface-container rounded p-0.5">
<button
  aria-label="List View"
  onClick={() => setLinkedView('list')}
  className={`px-2 py-1 rounded flex items-center justify-center transition-colors ${
    linkedView === 'list'
      ? 'bg-surface-container-lowest shadow-sm text-on-surface'
      : 'text-on-surface-variant hover:text-on-surface'
  }`}
>
  <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
</button>
<button
  aria-label="Graph View"
  onClick={() => setLinkedView('graph')}
  className={`px-2 py-1 rounded flex items-center justify-center transition-colors ${
    linkedView === 'graph'
      ? 'bg-surface-container-lowest shadow-sm text-on-surface'
      : 'text-on-surface-variant hover:text-on-surface'
  }`}
>
  <span className="material-symbols-outlined text-[16px]">hub</span>
</button>
</div>
</div>

{/* Graph View */}
{linkedView === 'graph' && (
  <div className="flex-grow relative">
    {graphLoading ? (
      <div className="flex items-center justify-center h-full text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin mr-2">sync</span>
        <span className="font-body-sm text-body-sm">Loading graph...</span>
      </div>
    ) : (
      <ReportGraph graphData={graphData} onNodeClick={handleGraphNodeClick} />
    )}
  </div>
)}

{/* List View */}
{linkedView === 'list' && (
  <div className="flex-grow overflow-y-auto pr-2 space-y-3 custom-scrollbar">
    {graphLoading ? (
      <div className="flex items-center justify-center py-8 text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin mr-2">sync</span>
        <span className="font-body-sm text-body-sm">Loading...</span>
      </div>
    ) : linkedReports.length > 0 ? (
      linkedReports.map((lr, i) => (
        <div
          key={lr.id}
          onClick={() => handleGraphNodeClick(lr.id)}
          className="block bg-surface border border-outline-variant rounded p-3 hover:bg-surface-container-high transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={`material-symbols-outlined text-[14px] ${
              lr.risk_level === 'HIGH' ? 'text-error' : 'text-primary'
            }`}>
              {lr.risk_level === 'HIGH' ? 'arrow_outward' : 'repeat'}
            </span>
            <span className="font-label-caps text-label-caps font-semibold text-on-surface">
              {lr.label_short}
            </span>
            <span className="ml-auto font-data-tabular text-data-tabular text-on-surface-variant">
              {Math.round(lr.strength * 100)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <div className="font-data-tabular text-data-tabular text-on-surface">{lr.id}</div>
            <div className="font-label-caps text-label-caps text-on-surface-variant">{lr.risk_level}</div>
          </div>
          <div className="font-body-sm text-body-sm text-on-surface-variant truncate mt-1">{lr.preview}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {lr.reasons?.map((r, j) => (
              <span key={j} className="font-label-caps text-label-caps text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
                {r.split(':')[0]}
              </span>
            ))}
          </div>
        </div>
      ))
    ) : (
      <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant">
        <span className="material-symbols-outlined text-[24px] mb-2" style={{ opacity: 0.3 }}>link_off</span>
        <span className="font-body-sm text-body-sm">No linked reports found</span>
      </div>
    )}
  </div>
)}

</div>

{/* Evidence Matches */}
{analysis?.evidence_matches && analysis.evidence_matches.length > 0 && (
<div className="bg-surface-container-lowest border border-outline-variant rounded p-5">
<h3 className="font-headline-sm text-headline-sm text-on-surface mb-4">RAG Evidence</h3>
<div className="space-y-3">
{analysis.evidence_matches.map((ev, i) => (
  <div key={i} className="bg-surface p-3 rounded border border-outline-variant">
    <div className="flex items-center justify-between mb-1">
      <span className="font-label-caps text-label-caps text-primary">{ev.source_label || ev.source}</span>
      <span className="font-data-tabular text-data-tabular text-on-surface-variant">
        {Math.round(ev.similarity_score * 100)}% match
      </span>
    </div>
    <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">{ev.text}</p>
  </div>
))}
</div>
</div>
)}

</div>

</div>
</div>
</main>
    </>
  );
}
