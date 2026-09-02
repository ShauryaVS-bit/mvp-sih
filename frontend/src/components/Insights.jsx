import React, { useState, useEffect } from 'react';
import { fetchGlobalInsights } from '../api/client';

export default function Insights({ onNavigate }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [manualPrompt, setManualPrompt] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualResult, setManualResult] = useState(null);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const data = await fetchGlobalInsights();
      setInsights(data);
    } catch (err) {
      setError(err.message || 'Failed to load insights from Knowledge Graph');
    } finally {
      setLoading(false);
    }
  };

  const handleManualAnalysis = async () => {
    import('../api/client').then(async ({ fetchManualInsights }) => {
      setManualLoading(true);
      setManualResult(null);
      try {
        const data = await fetchManualInsights(manualPrompt);
        setManualResult(data.analysis);
      } catch (err) {
        setManualResult(`Error: ${err.message || 'Failed to run analysis'}`);
      } finally {
        setManualLoading(false);
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="h-[48px] bg-surface-container border-b border-outline-variant flex items-center justify-between px-container-padding shrink-0">
        <div className="flex items-center gap-6 h-full">
          <span className="font-display-lg text-display-lg font-bold text-primary tracking-tight cursor-pointer" onClick={() => onNavigate('DASHBOARD')}>OIL Sentinel</span>
          <nav className="hidden md:flex h-full items-center gap-6 ml-4">
            <button onClick={() => onNavigate('DASHBOARD')} className="h-full flex flex-col justify-center text-on-surface-variant hover:text-primary transition-colors pb-1 font-body-md text-body-md">
              <span>Dashboard</span>
            </button>
            <button className="h-full flex flex-col justify-center text-primary border-b-2 border-primary pb-1 font-body-md text-body-md">
              <span>Insights (Agent 2)</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-container-padding">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Knowledge Graph Insights</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Live Cypher queries powered by Agent 2, extracting global safety patterns across all interconnected incident reports.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64 text-primary">
              <span className="material-symbols-outlined animate-spin text-[48px]">sync</span>
            </div>
          ) : error ? (
            <div className="bg-error/10 border border-error/30 text-error p-6 rounded-DEFAULT font-body-md text-body-md">
              <div className="flex items-center gap-2 mb-2 font-bold">
                <span className="material-symbols-outlined">warning</span>
                Failed to connect to Agent 2
              </div>
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Total Reports Overview */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT p-6 shadow-sm flex flex-col justify-center items-center">
                <span className="material-symbols-outlined text-[48px] text-primary mb-4 opacity-80">account_tree</span>
                <div className="font-display-lg text-[48px] font-bold text-on-surface leading-none mb-2">
                  {insights.total_reports}
                </div>
                <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
                  Total Reports In Graph
                </div>
              </div>

              {/* Top Hazards */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT p-6 shadow-sm">
                <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-error">warning</span>
                  Most Frequent Hazards
                </h2>
                <div className="space-y-4">
                  {insights.top_hazards && insights.top_hazards.length > 0 ? (
                    insights.top_hazards.map((h, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-error/10 text-error flex items-center justify-center font-bold text-xs">
                            {i + 1}
                          </div>
                          <span className="font-body-md text-body-md text-on-surface capitalize truncate max-w-[200px]" title={h.label}>
                            {h.label}
                          </span>
                        </div>
                        <span className="font-data-tabular text-data-tabular bg-surface-container px-2 py-1 rounded text-on-surface-variant">
                          {h.count} incidents
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-on-surface-variant font-body-sm text-body-sm">No hazard data available.</div>
                  )}
                </div>
              </div>

              {/* Top Locations */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT p-6 shadow-sm md:col-span-2">
                <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">location_on</span>
                  Hotspot Locations
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {insights.top_locations && insights.top_locations.length > 0 ? (
                    insights.top_locations.map((loc, i) => (
                      <div key={i} className="bg-surface-container-low border border-outline-variant rounded p-4 flex flex-col">
                        <span className="font-data-tabular text-data-tabular text-primary text-xl font-bold mb-1">
                          {loc.count} <span className="text-sm font-normal text-on-surface-variant">flags</span>
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface truncate" title={loc.label}>
                          {loc.label}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-on-surface-variant font-body-sm text-body-sm col-span-full">No location data available.</div>
                  )}
                </div>
              </div>

              {/* Manual Deep Analysis */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-DEFAULT p-6 shadow-sm md:col-span-2 mt-4">
                <h2 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">psychology</span>
                  Run Deep Graph Analysis (Agent 2)
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mb-4">
                  Trigger Agent 2 to run an extensive reasoning chain over the graph to find hidden escalations, barrier failures, and complex correlations.
                </p>
                <div className="flex flex-col gap-4">
                  <textarea 
                    className="w-full bg-surface-container p-4 border border-outline-variant rounded text-on-surface font-body-md focus:outline-none focus:border-primary resize-none"
                    rows="3"
                    placeholder="Optional: Enter a specific query (e.g., 'What are the leading causes of pressure relief valve failures?')"
                    value={manualPrompt}
                    onChange={(e) => setManualPrompt(e.target.value)}
                    disabled={manualLoading}
                  />
                  <div>
                    <button 
                      onClick={handleManualAnalysis}
                      disabled={manualLoading}
                      className="bg-primary text-on-primary px-6 py-2 rounded font-label-lg font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {manualLoading ? (
                        <><span className="material-symbols-outlined animate-spin text-[20px]">sync</span> Analyzing Graph...</>
                      ) : (
                        <><span className="material-symbols-outlined text-[20px]">search_insights</span> Execute Analysis</>
                      )}
                    </button>
                  </div>
                  
                  {manualResult && (
                    <div className="mt-6 bg-surface-container-low border border-outline-variant rounded p-6">
                      <h3 className="font-title-md text-title-md font-bold text-on-surface mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">auto_awesome</span>
                        Agent 2 Findings
                      </h3>
                      <div className="font-body-md text-body-md text-on-surface whitespace-pre-wrap leading-relaxed">
                        {manualResult}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
