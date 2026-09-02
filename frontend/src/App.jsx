import React, { useState, useEffect } from 'react';
import ReportsDashboard from './components/ReportsDashboard';
import ReportDetail from './components/ReportDetail';
import UploadReports from './components/UploadReports';
import Insights from './components/Insights';
import { fetchReports, analyzeReportById, checkHealth } from './api/client';

export default function App() {
  const [currentView, setCurrentView] = useState('DASHBOARD');
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await fetchReports();
      setReports(Array.isArray(data) ? data : (data.reports || []));
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  };

  const handleSelectReport = async (reportId) => {
    setSelectedReportId(reportId);
    setCurrentView('REPORT_DETAIL');
    setAnalysisResult(null); // Clear stale data
    setAnalysisLoading(true);
    try {
      const res = await analyzeReportById(reportId);
      setAnalysisResult(res);
    } catch (err) {
      console.error('Failed to analyze report:', err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleNavigate = (view) => {
    setCurrentView(view);
  };

  const selectedReport = reports.find(r => r.report_id === selectedReportId);

  return (
    <div className="h-full">
      {currentView === 'DASHBOARD' && (
        <ReportsDashboard 
          reports={reports} 
          onSelectReport={handleSelectReport} 
          onNavigate={handleNavigate} 
          onRefresh={loadReports}
        />
      )}
      {currentView === 'REPORT_DETAIL' && (
        <ReportDetail 
          report={selectedReport} 
          analysis={analysisResult}
          analysisLoading={analysisLoading}
          onNavigate={handleNavigate}
          onSelectReport={handleSelectReport}
        />
      )}
      {currentView === 'UPLOAD' && (
        <UploadReports 
          onNavigate={handleNavigate} 
        />
      )}
      {currentView === 'INSIGHTS' && (
        <Insights 
          onNavigate={handleNavigate} 
        />
      )}
    </div>
  );
}
