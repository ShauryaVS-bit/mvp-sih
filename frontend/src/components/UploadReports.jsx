import React, { useState, useEffect } from 'react';

export default function UploadReports({ onNavigate }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ status: 'idle', processed: 0, total: 0 });

  useEffect(() => {
    let intervalId;
    if (isUploading) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch('/api/analyze/status');
          if (res.ok) {
            const data = await res.json();
            setUploadStatus(data);
            if (data.status === 'completed') {
              setIsUploading(false);
              clearInterval(intervalId);
              onNavigate('DASHBOARD');
            }
          }
        } catch (error) {
          console.error("Failed to fetch upload status:", error);
        }
      }, 2000); // poll every 2 seconds
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isUploading, onNavigate]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    setUploadStatus({ status: 'queued', processed: 0, total: '...' });
    
    try {
      const text = await file.text(); // Read the raw text
      const response = await fetch('/api/analyze/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
      });
      
      if (!response.ok) {
        setIsUploading(false);
        alert("Failed to process the reports. Check backend logs.");
      }
      // We don't navigate away immediately anymore. We wait for polling to tell us it's done.
    } catch (error) {
      console.error(error);
      setIsUploading(false);
      alert("Error uploading file.");
    }
  };
  return (
    <>
      
{/* TopNavBar (Shared Component) */}
<nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-container-padding h-row-height-standard bg-surface-container-lowest border-b border-outline-variant">
<div className="flex items-center gap-container-padding h-full">
<span className="font-display-lg text-display-lg font-bold text-primary">OIL Sentinel</span>
<div className="hidden md:flex h-full items-center gap-gutter">
<a onClick={() => onNavigate('DASHBOARD')} className="h-full flex items-center px-unit text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer active:opacity-80">Dashboard</a>
<a onClick={() => onNavigate('INSIGHTS')} className="h-full flex items-center px-unit text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer active:opacity-80">Insights</a>
<a className="h-full flex items-center px-unit text-primary border-b-2 border-primary pb-1 hover:bg-surface-container transition-colors cursor-pointer active:opacity-80" href="#">New Report</a>
</div>
</div>
<div className="flex items-center gap-gutter">
<button className="p-unit rounded hover:bg-surface-container transition-colors text-on-surface-variant flex items-center justify-center">
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>notifications</span>
</button>
<button className="p-unit rounded hover:bg-surface-container transition-colors text-on-surface-variant flex items-center justify-center">
<span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 0" }}>account_circle</span>
</button>
</div>
</nav>
{/* Main Content Canvas */}
<main className="flex-grow py-container-padding px-container-padding overflow-y-auto">
<div className="w-full flex flex-col gap-container-padding">
<header className="flex flex-col gap-unit pb-gutter border-b border-surface-container-high">
<h1 className="font-headline-md text-headline-md text-primary">Upload and Process Reports</h1>
<p className="font-body-sm text-body-sm text-on-surface-variant">Securely upload incident reports, safety observations, and audit files for processing.</p>
</header>
<div className="flex flex-col gap-gutter bg-surface-container-lowest border border-outline-variant rounded p-container-padding">
<div className="flex flex-col gap-unit">
<h2 className="font-headline-sm text-headline-sm text-on-surface">Upload Safety Report</h2>
<p className="font-body-sm text-body-sm text-on-surface-variant">Drag and drop your files here or click to browse.</p>
</div>
{/* Drag and Drop Zone */}
<div className="border-2 border-dashed border-outline-variant rounded-lg p-container-padding flex flex-col items-center justify-center gap-gutter bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer min-h-[200px]" id="drop-zone">
<span className="material-symbols-outlined text-[48px] text-primary">cloud_upload</span>
<div className="text-center">
<p className="font-body-md text-body-md text-on-surface font-semibold mb-1">Click to upload or drag and drop</p>
<p className="font-body-sm text-body-sm text-on-surface-variant">Supported formats: PDF, DOCX, TXT (Max 25MB)</p>
</div>
<input accept=".txt,.csv,.jsonl" className="hidden" id="file-input" type="file" onChange={handleFileUpload} />
{isUploading ? (
    <div className="flex flex-col items-center gap-2 mt-2 w-full max-w-md">
        <div className="w-full bg-surface-container-high rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${uploadStatus.total ? (uploadStatus.processed / uploadStatus.total) * 100 : 0}%` }}></div>
        </div>
        <p className="font-body-sm text-primary font-medium">
            Processing via AI: {uploadStatus.processed} / {uploadStatus.total} reports done...
        </p>
    </div>
) : (
    <button className="px-container-padding h-row-height-dense flex items-center justify-center bg-primary text-on-primary font-label-caps text-label-caps rounded hover:opacity-90 transition-opacity mt-2" onClick={() => document.getElementById('file-input').click()} type="button">
        Browse Files
    </button>
)}
</div>
</div>
{/* Recent Uploads */}
<div className="flex flex-col gap-gutter bg-surface-container-lowest border border-outline-variant rounded p-container-padding mt-4">
<h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">Recent Uploads</h2>
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="border-b border-surface-container-high text-on-surface-variant font-label-caps text-label-caps">
<th className="py-2 px-unit font-medium">Filename</th>
<th className="py-2 px-unit font-medium">Date Uploaded</th>
<th className="py-2 px-unit font-medium">Status</th>
<th className="py-2 px-unit font-medium text-right">Actions</th>
</tr>
</thead>
<tbody className="font-body-md text-body-md text-on-surface">
<tr className="border-b border-surface-container-low hover:bg-surface-container-low transition-colors">
<td className="py-3 px-unit flex items-center gap-2">
<span className="material-symbols-outlined text-on-surface-variant text-[20px]">description</span>
                                    incident_report_Q3_alpha.pdf
                                </td>
<td className="py-3 px-unit text-on-surface-variant">Oct 24, 2023 - 09:12 AM</td>
<td className="py-3 px-unit">
<span className="inline-flex items-center px-2 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-label-caps gap-1">
<span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                                        Processing
                                    </span>
</td>
<td className="py-3 px-unit text-right">
<button className="p-1 rounded hover:bg-surface-variant transition-colors text-on-surface-variant">
<span className="material-symbols-outlined text-[20px]">more_vert</span>
</button>
</td>
</tr>
<tr className="border-b border-surface-container-low hover:bg-surface-container-low transition-colors">
<td className="py-3 px-unit flex items-center gap-2">
<span className="material-symbols-outlined text-on-surface-variant text-[20px]">description</span>
                                    safety_audit_rig_7.docx
                                </td>
<td className="py-3 px-unit text-on-surface-variant">Oct 23, 2023 - 14:45 PM</td>
<td className="py-3 px-unit">
<span className="inline-flex items-center px-2 py-1 rounded-full bg-[#d3f4d6] text-[#0d5915] font-label-caps text-label-caps gap-1">
<span className="material-symbols-outlined text-[14px]">check_circle</span>
                                        Uploaded
                                    </span>
</td>
<td className="py-3 px-unit text-right">
<button className="p-1 rounded hover:bg-surface-variant transition-colors text-on-surface-variant">
<span className="material-symbols-outlined text-[20px]">more_vert</span>
</button>
</td>
</tr>
<tr className="hover:bg-surface-container-low transition-colors">
<td className="py-3 px-unit flex items-center gap-2">
<span className="material-symbols-outlined text-on-surface-variant text-[20px]">description</span>
                                    observation_log_weekly.txt
                                </td>
<td className="py-3 px-unit text-on-surface-variant">Oct 20, 2023 - 11:30 AM</td>
<td className="py-3 px-unit">
<span className="inline-flex items-center px-2 py-1 rounded-full bg-[#d3f4d6] text-[#0d5915] font-label-caps text-label-caps gap-1">
<span className="material-symbols-outlined text-[14px]">check_circle</span>
                                        Uploaded
                                    </span>
</td>
<td className="py-3 px-unit text-right">
<button className="p-1 rounded hover:bg-surface-variant transition-colors text-on-surface-variant">
<span className="material-symbols-outlined text-[20px]">more_vert</span>
</button>
</td>
</tr>
</tbody>
</table>
</div>
</div>
</div>
</main>
{/* Script removed, drag and drop logic needs to be Reactified if fully functional, but for now we keep UI exact */}

    </>
  );
}
