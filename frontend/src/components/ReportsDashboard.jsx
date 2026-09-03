import React, { useState, useMemo } from 'react';
import { deleteReport, restoreReport } from '../api/client';

function formatIOGP(ruleString) {
  if (!ruleString || ruleString.trim() === '') return { rule: 'General Safety', icon: 'health_and_safety' };
  
  const rules = ruleString.split(',').map(r => r.trim());
  const rule = rules[0]; 
  
  let icon = 'health_and_safety';
  const lRule = rule.toLowerCase();
  if (lRule.includes('energy') || lRule.includes('isolation')) icon = 'bolt';
  else if (lRule.includes('lift')) icon = 'crane';
  else if (lRule.includes('process')) icon = 'factory';
  else if (lRule.includes('line of fire')) icon = 'warning';
  else if (lRule.includes('work authorization')) icon = 'assignment_turned_in';
  else if (lRule.includes('bypassing')) icon = 'gpp_bad';
  else if (lRule.includes('confined')) icon = 'door_back';
  else if (lRule.includes('driving')) icon = 'directions_car';
  else if (lRule.includes('hot work')) icon = 'local_fire_department';
  else if (lRule.includes('safe system')) icon = 'security';
  else if (lRule.includes('working at height')) icon = 'height';

  return { rule: ruleString, icon };
}

// Format timestamp to relative or short date
function formatTimestamp(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  } catch {
    return ts.slice(0, 10);
  }
}

export default function ReportsDashboard({ reports, onSelectReport, onNavigate, onRefresh }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sifFilter, setSifFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [iogpFilter, setIogpFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [undoToast, setUndoToast] = useState(null);

  const handleDelete = async (e, reportId) => {
    e.stopPropagation();
    try {
      await deleteReport(reportId);
      if (onRefresh) onRefresh();
      setUndoToast({ reportId, message: `Report deleted. It will be permanently discarded in 1 day.` });
      setTimeout(() => setUndoToast(null), 10000);
    } catch(err) {
      console.error(err);
    }
  };

  const handleUndo = async () => {
    if (!undoToast) return;
    try {
      await restoreReport(undoToast.reportId);
      if (onRefresh) onRefresh();
      setUndoToast(null);
    } catch(err) {
      console.error(err);
    }
  };

  const filteredAndSortedReports = useMemo(() => {
    if (!reports) return [];
    
    let processed = [...reports];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      processed = processed.filter(r => {
        const iogp = formatIOGP(r.iogp_rule).rule.toLowerCase();
        const sifStatus = r.sif_potential ? 'positive' : 'negative';
        const timeStr = formatTimestamp(r.timestamp).toLowerCase();
        const desc = (r.preview || r.raw_text || '').toLowerCase();
        return (
          (r.report_id && r.report_id.toLowerCase().includes(q)) ||
          (r.site && r.site.toLowerCase().includes(q)) ||
          (r.functional_location && r.functional_location.toLowerCase().includes(q)) ||
          (r.category && r.category.toLowerCase().includes(q)) ||
          (desc.includes(q)) ||
          (iogp.includes(q)) ||
          (sifStatus.includes(q)) ||
          (timeStr.includes(q)) ||
          (r.risk_level && r.risk_level.toLowerCase().includes(q))
        );
      });
    }

    // SIF Tier Filter
    if (sifFilter) {
      processed = processed.filter(r => {
        if (sifFilter === 'critical') return r.risk_level === 'HIGH' && r.sif_potential;
        if (sifFilter === 'high') return r.risk_level === 'HIGH' && !r.sif_potential;
        if (sifFilter === 'moderate') return r.risk_level === 'MEDIUM';
        if (sifFilter === 'low') return r.risk_level === 'LOW';
        return true;
      });
    }

    // Category Filter
    if (categoryFilter) {
      processed = processed.filter(r => {
        const cat = (r.category || '').toLowerCase();
        if (categoryFilter === 'ua') return cat.includes('unsafe act');
        if (categoryFilter === 'uc') return cat.includes('unsafe condition') || cat.includes('working condition');
        if (categoryFilter === 'nearmiss') return cat.includes('near miss') || cat.includes('near-miss');
        if (categoryFilter === 'observation') return cat.includes('observation');
        return true;
      });
    }

    // IOGP Rule Filter
    if (iogpFilter) {
      processed = processed.filter(r => {
        const iogp = formatIOGP(r.iogp_rule);
        const rule = iogp.rule.toLowerCase();
        if (iogpFilter === 'energy') return rule.includes('energy isolation');
        if (iogpFilter === 'lifting') return rule.includes('lifting');
        if (iogpFilter === 'process') return rule.includes('process');
        if (iogpFilter === 'lof') return rule.includes('line of fire');
        return true;
      });
    }

    // Sort
    if (sortOrder === 'newest') {
      processed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (sortOrder === 'sif_desc') {
      processed.sort((a, b) => (b.overall_risk_score || 0) - (a.overall_risk_score || 0));
    }

    return processed;
  }, [reports, searchQuery, sifFilter, categoryFilter, iogpFilter, sortOrder]);

  return (
    <div className="h-full flex flex-col">
      
{/* TopNavBar Component */}
<header className="bg-surface-container-lowest border-b border-outline-variant w-full z-50 flex justify-between items-center px-container-padding h-row-height-standard shrink-0">
<div className="flex items-center gap-6 h-full">
<span className="font-display-lg text-display-lg font-bold text-primary tracking-tight">OIL Sentinel</span>
<nav className="hidden md:flex h-full items-center gap-6 ml-4">
<button className="h-full flex flex-col justify-center text-primary border-b-2 border-primary pb-1 font-body-md text-body-md">
<span className="">Dashboard</span>
</button>
<button onClick={() => onNavigate('INSIGHTS')} className="h-full flex flex-col justify-center text-on-surface-variant hover:text-primary transition-colors pb-1 font-body-md text-body-md">
<span>Insights</span>
</button>
</nav>
</div>
<div className="flex-1 max-w-xl mx-8 hidden md:block">
<div className="relative w-full">
<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
<span className="material-symbols-outlined text-on-surface-variant text-sm">search</span>
</div>
<input 
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="block w-full pl-10 pr-3 py-1.5 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest text-on-surface placeholder-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-colors font-body-sm text-body-sm" 
  placeholder="Search reports, sites, SIF IDs..." 
  type="text" 
/>
</div>
</div>
<div className="flex items-center gap-4">
<button onClick={onRefresh} className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer active:opacity-80 flex items-center justify-center p-1.5" title="Refresh Dashboard">
  <span className="material-symbols-outlined text-sm">refresh</span>
</button><button onClick={() => onNavigate('UPLOAD')} className="bg-primary text-on-primary font-body-md text-body-md px-4 py-1.5 rounded-DEFAULT hover:bg-primary-container transition-colors flex items-center gap-2">
<span className="material-symbols-outlined text-sm">add</span>
<span className="">New Report</span>
</button>
<div className="flex items-center gap-3 ml-2 border-l border-outline-variant pl-4">
<button className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer active:opacity-80">
<span className="material-symbols-outlined">notifications</span>
</button>
<button className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer active:opacity-80">
<span className="material-symbols-outlined filled">account_circle</span>
</button>
</div>
</div>
</header>
<main className="flex-1 overflow-hidden flex flex-col">
{/* Filter Bar */}
<div className="bg-surface-container-lowest border-b border-outline-variant py-2 px-container-padding flex flex-wrap gap-3 items-center">
<span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mr-1">FILTERS</span>
<div className="flex items-center gap-1.5">
  <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">SIF TIER</span>
  <select value={sifFilter} onChange={(e) => setSifFilter(e.target.value)} className="border-none bg-surface-container-low text-on-surface text-xs font-medium rounded py-1 pl-2 pr-6 min-w-[120px] focus:ring-1 focus:ring-primary cursor-pointer">
    <option value="">All</option>
    <option value="critical">Critical</option>
    <option value="high">High</option>
    <option value="moderate">Moderate</option>
    <option value="low">Low</option>
  </select>
</div>
<div className="flex items-center gap-1.5">
  <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">CATEGORY</span>
  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border-none bg-surface-container-low text-on-surface text-xs font-medium rounded py-1 pl-2 pr-6 min-w-[120px] focus:ring-1 focus:ring-primary cursor-pointer">
    <option value="">All</option>
    <option value="ua">Unsafe Act</option>
    <option value="uc">Unsafe Condition</option>
    <option value="nearmiss">Near-Miss</option>
    <option value="observation">Observation</option>
  </select>
</div>
<div className="flex items-center gap-1.5">
  <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider whitespace-nowrap">IOGP RULE</span>
  <select value={iogpFilter} onChange={(e) => setIogpFilter(e.target.value)} className="border-none bg-surface-container-low text-on-surface text-xs font-medium rounded py-1 pl-2 pr-6 min-w-[120px] focus:ring-1 focus:ring-primary cursor-pointer">
    <option value="">All</option>
    <option value="energy">Energy Isolation</option>
    <option value="lifting">Lifting Operations</option>
    <option value="process">Process Safety</option>
    <option value="lof">Line of Fire</option>
  </select>
</div>
<div className="flex-1"></div>
<div className="flex items-center gap-1.5">
<span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">SORT BY</span>
<select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="border-none bg-surface-container-lowest text-on-surface text-xs font-medium py-1 pl-2 pr-6 min-w-[130px] focus:ring-0 cursor-pointer">
<option value="newest">Newest First</option>
<option value="sif_desc">SIF Tier (High-Low)</option>
</select>
</div>
</div>
{/* Main Content Area */}
<div className="flex-1 overflow-auto bg-background px-container-padding py-6">
<div className="w-full">
<div className="flex justify-between items-end mb-4">
<div className="font-headline-md text-headline-md text-on-surface"></div>
<span className="font-data-tabular text-data-tabular text-on-surface-variant">
  {filteredAndSortedReports.length} reports {filteredAndSortedReports.length !== reports?.length ? `(filtered from ${reports?.length || 0})` : 'loaded'}
</span>
</div>
<div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT overflow-hidden">
{/* Header Row */}
<div className="flex items-center bg-surface-container-low border-b border-outline-variant px-4 py-2 text-on-surface-variant font-label-caps text-label-caps font-bold sticky top-0 z-10">
<div className="w-24">SIF TIER</div>
<div className="w-24">TIME</div>
<div className="w-[450px]">LOCATION</div>
<div className="w-[300px]">IOGP RULE</div>
<div className="w-64">CATEGORY</div>
<div className="flex-1">SIF</div>
<div className="w-20 text-center">ACTIONS</div>
</div>

{filteredAndSortedReports && filteredAndSortedReports.length > 0 ? (
  filteredAndSortedReports.map((report) => {
    // Map risk_level to SIF Tier
    let tierConfig = {
      label: 'PENDING',
      bgClass: 'bg-outline-variant',
      textClass: 'text-on-surface-variant'
    };
    if (report.risk_level === 'HIGH' && report.sif_potential) {
      tierConfig = { label: 'CRITICAL', bgClass: 'bg-error', textClass: 'text-error' };
    } else if (report.risk_level === 'HIGH') {
      tierConfig = { label: 'HIGH', bgClass: 'bg-[#d97706]', textClass: 'text-[#d97706]' };
    } else if (report.risk_level === 'MEDIUM') {
      tierConfig = { label: 'MODERATE', bgClass: 'bg-[#65a30d]', textClass: 'text-[#65a30d]' };
    } else if (report.risk_level === 'LOW') {
      tierConfig = { label: 'LOW', bgClass: 'bg-[#3b82f6]', textClass: 'text-[#3b82f6]' };
    }

    const iogp = formatIOGP(report.iogp_rule);

    return (
      <div key={report.report_id} onClick={() => onSelectReport(report.report_id)} className="flex items-center border-b border-surface-container hover:bg-surface-container-low transition-colors px-4 group cursor-pointer" style={{ minHeight: '44px' }}>
        {/* SIF TIER */}
        <div className="w-24 flex items-center gap-2">
          <div className={`w-1 h-5 ${tierConfig.bgClass} rounded-full`}></div>
          <span className={`font-label-caps text-label-caps font-bold ${tierConfig.textClass}`}>{tierConfig.label}</span>
        </div>
        {/* TIME */}
        <div className="w-24 font-data-tabular text-data-tabular font-bold text-on-surface-variant">
          {formatTimestamp(report.timestamp)}
        </div>
        {/* LOCATION */}
        <div className="w-[450px] min-w-0 pr-8 flex items-center gap-2">
          <div className="font-data-tabular text-data-tabular text-on-surface-variant shrink-0" title={report.report_id}>
            {report.report_id}
          </div>
          <div className="text-outline-variant text-[10px]">|</div>
          <div className="font-body-sm text-body-sm text-on-surface truncate" title={report.functional_location || report.site}>
            {report.site || '—'}
          </div>
        </div>
        {/* IOGP RULE */}
        <div className="w-[300px] pr-2 flex items-center min-w-0">
          <span className="inline-block font-label-caps text-label-caps font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded truncate max-w-full" title={iogp.rule}>
            {iogp.rule}
          </span>
        </div>
        {/* CATEGORY (was cause before, but category makes more sense here, cause drives the fact) */}
        <div className="w-64 font-body-sm text-body-sm font-bold text-on-surface truncate pr-8" title={report.category}>
          {report.category || '—'}
        </div>
        {/* SIF Status */}
        <div className="flex-1 min-w-0">
          <span className={`inline-block font-label-caps text-label-caps font-bold px-2 py-0.5 rounded truncate max-w-full ${
            report.sif_potential ? 'text-error bg-error/10' : 'text-on-surface-variant bg-surface-container'
          }`}>
            {report.sif_potential ? 'Positive' : 'Negative'}
          </span>
        </div>
        {/* Actions */}
        <div className="w-20 flex justify-end gap-2 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => handleDelete(e, report.report_id)}
            className="hover:text-error transition-colors p-1" 
            title="Delete Report"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
          <button className="hover:text-primary transition-colors p-1" title="View details">
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    );
  })
) : (
  <div className="p-6 text-center text-on-surface-variant font-body-sm">
    <span className="material-symbols-outlined text-[24px] mb-2 block opacity-30">inbox</span>
    No reports found or loading...
  </div>
)}
</div>
</div>
</div>
</main>

{/* Undo Toast */}
{undoToast && (
  <div className="fixed bottom-6 right-6 bg-surface-container-high border border-outline-variant text-on-surface px-4 py-3 rounded shadow-lg flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5">
    <span className="font-body-sm text-body-sm">{undoToast.message}</span>
    <button 
      onClick={handleUndo}
      className="text-primary font-label-caps text-label-caps font-bold hover:underline uppercase tracking-wider"
    >
      Undo
    </button>
    <button 
      onClick={() => setUndoToast(null)}
      className="text-on-surface-variant hover:text-on-surface flex items-center"
    >
      <span className="material-symbols-outlined text-[16px]">close</span>
    </button>
  </div>
)}

    </div>
  );
}
