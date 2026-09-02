import axios from 'axios'

const BASE_URL = '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s — RAG retrieval can be slow on first run
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * GET /api/reports
 * Returns list of reports sorted by risk score (HIGH first)
 */
export async function fetchReports() {
  const res = await api.get('/reports')
  return res.data
}

/**
 * GET /api/reports/:id
 * Runs full pipeline on a synthetic report by ID
 */
export async function analyzeReportById(reportId) {
  const res = await api.get(`/reports/${reportId}`)
  return res.data
}

/**
 * POST /api/analyze
 * Runs full pipeline on raw text
 */
export async function analyzeText(text, reportId = null) {
  const payload = { text }
  if (reportId) payload.report_id = reportId
  const res = await api.post('/analyze', payload)
  return res.data
}

/**
 * POST /api/analyze/bulk
 * Runs bulk pipeline on raw file text
 */
export async function analyzeBulkText(text) {
  const payload = { text }
  const res = await api.post('/analyze/bulk', payload)
  return res.data
}

/**
 * GET /api/analyze/status
 */
export async function checkBulkStatus() {
  const res = await api.get('/analyze/status')
  return res.data
}

/**
 * GET /api/health
 */
export async function checkHealth() {
  const res = await api.get('/health')
  return res.data
}

/**
 * GET /api/analytics/months
 */
export async function fetchAnalyticsMonths() {
  const res = await api.get('/analytics/months')
  return res.data
}

/**
 * GET /api/analytics/monthly_report?month=...
 */
export async function fetchMonthlyReport(month = 'All-Time') {
  const res = await api.get('/analytics/monthly_report', { params: { month } })
  return res.data
}
/**
 * GET /api/reports/:id/linked
 * Returns graph of related reports { nodes, edges, source_id, total_linked }
 */
export async function fetchLinkedReports(reportId) {
  const res = await api.get(`/reports/${reportId}/linked`)
  return res.data
}

export async function deleteReport(reportId) {
  const res = await api.delete(`/reports/${reportId}`)
  return res.data
}

export async function restoreReport(reportId) {
  const res = await api.post(`/reports/${reportId}/restore`)
  return res.data
}

export async function fetchGlobalInsights() {
  const res = await api.get('/insights/global')
  return res.data
}

export async function fetchManualInsights(prompt = "") {
  const res = await api.post('/insights/query', { prompt })
  return res.data
}

export default api


