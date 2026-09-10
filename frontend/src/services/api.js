const BASE_URL = '/api';

/**
 * Helper to handle fetch responses and extract error details if any.
 */
async function handleResponse(response, defaultErrorMsg) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || defaultErrorMsg);
  }
  return response.json();
}

/**
 * Fetch current job criteria and structured data
 */
export async function getJobCriteria() {
  const res = await fetch(`${BASE_URL}/job`);
  return handleResponse(res, 'Failed to fetch job criteria');
}

/**
 * Update job criteria with new job description text and re-extract criteria
 */
export async function updateJobCriteria(jobDescriptionText) {
  const res = await fetch(`${BASE_URL}/job/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ job_description: jobDescriptionText }),
  });
  return handleResponse(res, 'Failed to update job criteria');
}

/**
 * List all uploaded resumes from the server
 */
export async function getResumes() {
  const res = await fetch(`${BASE_URL}/resumes`);
  return handleResponse(res, 'Failed to fetch resumes');
}

/**
 * Upload a resume file (PDF or DOCX) to the server
 */
export async function uploadResumeFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res, `Failed to upload ${file.name}`);
}

/**
 * Delete a resume file and its cached analysis
 */
export async function deleteResumeFile(filename) {
  const res = await fetch(`${BASE_URL}/resumes/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  return handleResponse(res, `Failed to delete ${filename}`);
}

/**
 * Get currently evaluated results from the server cache
 */
export async function getEvaluatedResults() {
  const res = await fetch(`${BASE_URL}/results`);
  return handleResponse(res, 'Failed to fetch evaluated results');
}

/**
 * Run batch analysis on resumes in the vault
 */
export async function runBatchAnalysis(filenames = []) {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filenames && filenames.length > 0 ? { filenames } : {}),
  });
  return handleResponse(res, 'Failed to run batch analysis');
}

/**
 * Fetch pre-computed demo dataset for quick preview
 */
export async function getDemoData() {
  const res = await fetch(`${BASE_URL}/demo-data`);
  return handleResponse(res, 'Failed to fetch demo data');
}
