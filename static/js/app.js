/**
 * Resume Intelligence Studio - Client Controller
 * Strict anti-slop rules: clean slate on first load, zero preloaded mock data unless Demo Mode is chosen.
 */

(function () {
  'use strict';

  // State Management
  const state = {
    job: null,
    resumes: [],
    results: [],
    filter: 'all',
    searchQuery: '',
    isAnalyzing: false,
    selectedCandidate: null,
    isDemo: false
  };

  // Helper: Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // DOM Elements
  const els = {
    activeRolePill: document.getElementById('active-role-pill'),
    navResetBtn: document.getElementById('nav-reset-btn'),
    navDemoBtn: document.getElementById('nav-demo-btn'),
    navRunBtn: document.getElementById('nav-run-btn'),
    heroRunBtn: document.getElementById('hero-run-btn'),
    heroUploadShortcut: document.getElementById('hero-upload-shortcut'),
    vaultCountStat: document.getElementById('vault-count-stat'),
    vaultBadgeCount: document.getElementById('vault-badge-count'),
    jobRoleDisplay: document.getElementById('job-role-display'),
    jobExpDisplay: document.getElementById('job-exp-display'),
    toggleJdEditBtn: document.getElementById('toggle-jd-edit-btn'),
    jdEditorDrawer: document.getElementById('jd-editor-drawer'),
    criteriaView: document.getElementById('criteria-view'),
    jdTextarea: document.getElementById('jd-textarea'),
    cancelJdBtn: document.getElementById('cancel-jd-btn'),
    saveJdBtn: document.getElementById('save-jd-btn'),
    uploadDropzone: document.getElementById('upload-dropzone'),
    fileInput: document.getElementById('file-input'),
    vaultUploadBtn: document.getElementById('vault-upload-btn'),
    vaultFilesList: document.getElementById('vault-files-list'),
    refreshVaultBtn: document.getElementById('refresh-vault-btn'),
    candidateSearchInput: document.getElementById('candidate-search-input'),
    scoreFilters: document.getElementById('score-filters'),
    analysisProgressBox: document.getElementById('analysis-progress-box'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    progressStatusText: document.getElementById('progress-status-text'),
    progressPercentText: document.getElementById('progress-percent-text'),
    bentoResultsGrid: document.getElementById('bento-results-grid'),
    inspectorBackdrop: document.getElementById('inspector-backdrop'),
    inspectorDrawer: document.getElementById('inspector-drawer'),
    drawerCloseBtn: document.getElementById('drawer-close-btn'),
    drawerCandidateName: document.getElementById('drawer-candidate-name'),
    drawerRankTag: document.getElementById('drawer-rank-tag'),
    drawerFilename: document.getElementById('drawer-filename'),
    drawerRadialProgress: document.getElementById('drawer-radial-progress'),
    drawerScoreVal: document.getElementById('drawer-score-val'),
    drawerVerdictText: document.getElementById('drawer-verdict-text'),
    drawerExpBadge: document.getElementById('drawer-exp-badge'),
    drawerExpYears: document.getElementById('drawer-exp-years'),
    drawerEmail: document.getElementById('drawer-email'),
    drawerPhone: document.getElementById('drawer-phone'),
    drawerMatchingSkills: document.getElementById('drawer-matching-skills'),
    drawerMissingSkills: document.getElementById('drawer-missing-skills'),
    drawerExperienceList: document.getElementById('drawer-experience-list'),
    drawerEducationList: document.getElementById('drawer-education-list'),
    drawerProjectsList: document.getElementById('drawer-projects-list'),
    toastStack: document.getElementById('toast-stack')
  };

  // Toast Dispatcher
  function showToast(message, type = 'normal') {
    if (!els.toastStack) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    els.toastStack.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'opacity 200ms ease, transform 200ms ease';
      setTimeout(() => toast.remove(), 200);
    }, 3200);
  }

  // Load Initial Data (Auto-clears all cache and state on fresh load / refresh)
  async function init() {
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch (e) {
      console.warn('Could not reset on init:', e);
    }

    state.job = null;
    state.resumes = [];
    state.results = [];
    state.isDemo = false;

    await fetchJobCriteria();
    await fetchResumesList();

    // Render clean empty state by default
    renderBentoGrid();
    setupEventListeners();
  }

  // Fetch Target Job Specifications
  async function fetchJobCriteria() {
    try {
      const res = await fetch('/api/job');
      if (!res.ok) throw new Error('Failed to load job description');
      const data = await res.json();
      state.job = data;
      renderJobCriteria(data);
    } catch (err) {
      renderJobCriteria(null);
    }
  }

  // Render Target Criteria
  function renderJobCriteria(jobData) {
    const st = (jobData && jobData.structured) ? jobData.structured : null;
    const hasJd = Boolean(jobData && jobData.text && jobData.text.trim().length > 0 && st);

    if (!hasJd) {
      els.activeRolePill.textContent = 'No Role Configured';
      els.activeRolePill.classList.add('faint');
      els.jobRoleDisplay.textContent = 'Role Criteria (Not Set)';
      els.jobExpDisplay.textContent = 'Min Exp: --';
      els.toggleJdEditBtn.textContent = '+ Add Job Description';
      els.jdTextarea.value = (jobData && jobData.text) || '';

      els.criteriaView.innerHTML = `
        <div class="criteria-empty-box">
          <div class="empty-icon-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <div class="empty-text">
            <strong>Define Target Criteria</strong>
            <p>Paste a job description so Groq AI can extract required skills, experience levels, and qualifications.</p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="empty-add-jd-btn-inline">+ Add Job Description</button>
        </div>
      `;

      document.getElementById('empty-add-jd-btn-inline')?.addEventListener('click', openJdEditor);
      return;
    }

    els.activeRolePill.textContent = `Target: ${st.role || 'Role Set'}${state.isDemo ? ' (Demo)' : ''}`;
    els.activeRolePill.classList.remove('faint');
    els.jobRoleDisplay.textContent = st.role || 'Role Criteria';
    els.jobExpDisplay.textContent = `Min Exp: ${st.minimum_experience !== null && st.minimum_experience !== undefined ? st.minimum_experience + ' yr' : 'Flexible'}`;
    els.toggleJdEditBtn.textContent = 'Edit Job Description';
    els.jdTextarea.value = jobData.text || '';

    const reqSkills = st.required_skills || [];
    const prefSkills = st.preferred_skills || [];
    const edu = st.education_requirements || ['Degree in STEM or equivalent practical experience'];

    els.criteriaView.innerHTML = `
      <div class="criteria-group">
        <div class="group-label">Required Skills (${reqSkills.length})</div>
        <div class="tags-cluster" id="required-skills-tags">
          ${reqSkills.map(skill => `<span class="tag tag-primary">${escapeHtml(skill)}</span>`).join('')}
        </div>
      </div>

      <div class="criteria-group">
        <div class="group-label">Preferred Skills (${prefSkills.length})</div>
        <div class="tags-cluster" id="preferred-skills-tags">
          ${prefSkills.map(skill => `<span class="tag tag-muted">${escapeHtml(skill)}</span>`).join('')}
        </div>
      </div>

      <div class="criteria-group">
        <div class="group-label">Education Requirements</div>
        <ul class="criteria-list" id="education-requirements-list">
          ${edu.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  // Drawer Helpers
  function openJdEditor() {
    els.jdEditorDrawer.classList.remove('hidden');
    els.criteriaView.classList.add('hidden');
    els.toggleJdEditBtn.textContent = 'Close Editor';
    setTimeout(() => els.jdTextarea.focus(), 60);
  }

  function closeJdEditor() {
    els.jdEditorDrawer.classList.add('hidden');
    els.criteriaView.classList.remove('hidden');
    const hasJd = state.job && state.job.text && state.job.text.trim().length > 0;
    els.toggleJdEditBtn.textContent = hasJd ? 'Edit Job Description' : '+ Add Job Description';
  }

  // Fetch Vault Resumes
  async function fetchResumesList() {
    try {
      const res = await fetch('/api/resumes');
      if (!res.ok) throw new Error('Failed to load vault');
      const data = await res.json();
      state.resumes = data.resumes || [];
      renderVaultList(state.resumes);
    } catch (err) {
      showToast('Error loading resume vault.', 'error');
    }
  }

  // Render Vault List
  function renderVaultList(files) {
    els.vaultBadgeCount.textContent = `${files.length} Resumes`;
    els.vaultCountStat.textContent = files.length;

    if (files.length === 0) {
      els.vaultFilesList.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 12.5px;">
          No resumes in vault. Drag and drop PDF or DOCX files above.
        </div>`;
      return;
    }

    els.vaultFilesList.innerHTML = '';
    files.forEach(file => {
      const item = document.createElement('div');
      item.className = 'vault-item';
      item.innerHTML = `
        <div class="file-info">
          <span class="ext-badge">${escapeHtml(file.extension)}</span>
          <div>
            <div class="file-name" title="${escapeHtml(file.filename)}">${escapeHtml(file.filename)}</div>
            <div class="file-size">${file.size_kb} KB</div>
          </div>
        </div>
        <button type="button" class="btn-icon-del" data-filename="${escapeHtml(file.filename)}" title="Remove file">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;

      item.querySelector('.btn-icon-del').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteResumeFile(file.filename);
      });

      els.vaultFilesList.appendChild(item);
    });
  }

  // Delete Resume
  async function deleteResumeFile(filename) {
    try {
      const res = await fetch(`/api/resumes/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast(`Deleted ${filename}`, 'normal');
      state.results = state.results.filter(r => r.filename !== filename);
      renderBentoGrid();
      await fetchResumesList();
    } catch (err) {
      showToast('Could not delete resume.', 'error');
    }
  }

  // Upload Handler with Automatic Immediate Evaluation if JD is configured
  async function uploadFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    els.analysisProgressBox.classList.remove('hidden');
    els.progressBarFill.style.width = '30%';
    els.progressPercentText.textContent = '30%';
    els.progressStatusText.textContent = 'Uploading candidate document to vault...';

    for (const file of fileList) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['pdf', 'docx'].includes(ext)) {
        showToast(`Skipping ${file.name}: only PDF and DOCX supported.`, 'error');
        continue;
      }
      const formData = new FormData();
      formData.append('file', file);

      try {
        els.progressStatusText.textContent = `Analyzing ${file.name}...`;
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();

        if (data.candidate) {
          // If we had demo results before real uploads, clear them
          if (state.isDemo) {
            state.isDemo = false;
            state.results = [];
            els.navDemoBtn.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Demo Mode
            `;
            els.navDemoBtn.classList.remove('btn-active');
          }

          // Remove old entry for same filename if any, then insert evaluated candidate
          state.results = state.results.filter(r => r.filename !== file.name);
          state.results.unshift(data.candidate);
          state.results.sort((a, b) => b.score - a.score);
          renderBentoGrid();
          showToast(`Evaluated ${data.candidate.name || file.name}! Match: ${data.candidate.score}%`, 'success');
        } else {
          showToast(`Uploaded ${file.name} to vault.`, 'success');
        }

        if (data.eval_error) {
          showToast(`Notice for ${file.name}: ${data.eval_error}`, 'normal');
        }
      } catch (err) {
        showToast(`Upload failed for ${file.name}`, 'error');
      }
    }

    els.progressBarFill.style.width = '100%';
    els.progressPercentText.textContent = '100%';
    els.progressStatusText.textContent = 'Processing complete.';
    setTimeout(() => {
      els.analysisProgressBox.classList.add('hidden');
    }, 1200);

    await fetchResumesList();
  }

  // Toggle Demo Mode
  async function toggleDemoMode() {
    if (state.isDemo) {
      // Exit Demo Mode -> Clean State
      state.isDemo = false;
      state.results = [];
      state.job = null;
      els.navDemoBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        Demo Mode
      `;
      els.navDemoBtn.classList.remove('btn-active');
      renderJobCriteria(null);
      renderBentoGrid();
      showToast('Exited demo mode. Workspace is clean and ready for your data.', 'normal');
      return;
    }

    try {
      showToast('Loading Demo Mode...', 'normal');
      const res = await fetch('/api/demo-data');
      if (!res.ok) throw new Error('Demo data unavailable');
      const data = await res.json();
      state.isDemo = true;
      state.results = data.results || [];
      state.job = {
        text: data.job_text || '',
        structured: data.job_structured || null
      };

      els.navDemoBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        Exit Demo
      `;
      els.navDemoBtn.classList.add('btn-active');

      renderJobCriteria(state.job);
      renderBentoGrid();
      showToast('Demo Mode active: Amazon SDE-I role & 4 candidate evaluations loaded.', 'success');
    } catch (err) {
      showToast('Could not load demo evaluations.', 'error');
    }
  }

  // Trigger Live Analysis
  async function runLiveAnalysis() {
    if (state.isAnalyzing) return;

    // Guard: Check if Job Description is defined
    if (!state.job || !state.job.text || !state.job.text.trim()) {
      showToast('Please add a Job Description first so resumes can be scored accurately.', 'error');
      openJdEditor();
      return;
    }

    if (state.resumes.length === 0) {
      showToast('Please upload at least one resume (PDF/DOCX) in the vault to evaluate.', 'error');
      els.fileInput.click();
      return;
    }

    state.isAnalyzing = true;
    els.analysisProgressBox.classList.remove('hidden');
    els.progressBarFill.style.width = '15%';
    els.progressPercentText.textContent = '15%';
    els.progressStatusText.textContent = 'Parsing resumes with PyPDF and python-docx...';

    // Progressive animation milestones while waiting for API
    let step = 15;
    const interval = setInterval(() => {
      if (step < 85) {
        step += 10;
        els.progressBarFill.style.width = `${step}%`;
        els.progressPercentText.textContent = `${step}%`;
        if (step > 40) {
          els.progressStatusText.textContent = 'Evaluating skill alignment and experience against role criteria...';
        }
      }
    }, 1500);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      clearInterval(interval);
      els.progressBarFill.style.width = '100%';
      els.progressPercentText.textContent = '100%';
      els.progressStatusText.textContent = 'Evaluation complete.';

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Analysis request failed');
      }

      const data = await res.json();
      state.isDemo = false;
      state.results = data.results || [];

      if (data.errors && data.errors.length > 0) {
        data.errors.forEach(e => {
          showToast(`Issue with ${e.filename}: ${e.error}`, 'error');
        });
      }

      showToast(`Evaluated ${state.results.length} candidate resumes successfully.`, 'success');
      renderBentoGrid();

      setTimeout(() => {
        els.analysisProgressBox.classList.add('hidden');
      }, 1500);
    } catch (err) {
      clearInterval(interval);
      els.progressBarFill.style.width = '100%';
      els.progressStatusText.textContent = 'Evaluation halted.';
      showToast(`Analysis Notice: ${err.message}`, 'error');
      setTimeout(() => {
        els.analysisProgressBox.classList.add('hidden');
      }, 2500);
    } finally {
      state.isAnalyzing = false;
    }
  }

  // Render Bento Matrix Grid
  function renderBentoGrid() {
    // 1. Clean Empty State when no candidates evaluated
    if (state.results.length === 0) {
      els.bentoResultsGrid.innerHTML = `
        <div class="bento-empty-wrapper">
          <div class="empty-halo-glow"></div>
          <div class="empty-icon-shield">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <h3 class="bento-empty-title">Ready for Candidate Evaluation</h3>
          <p class="bento-empty-subtitle">
            Configure your target job description and upload candidate resumes (PDF or DOCX) in the vault to evaluate, score, and rank candidates with Groq AI.
          </p>
          <div class="workflow-steps-pill-bar">
            <div class="workflow-pill-step">
              <span class="pill-step-index">1</span>
              <span>Add Job Description</span>
            </div>
            <span class="workflow-step-divider">→</span>
            <div class="workflow-pill-step">
              <span class="pill-step-index">2</span>
              <span>Upload Resumes</span>
            </div>
            <span class="workflow-step-divider">→</span>
            <div class="workflow-pill-step">
              <span class="pill-step-index">3</span>
              <span>Analyze & Rank</span>
            </div>
          </div>
          <div class="empty-cta-group">
            <button type="button" class="btn btn-primary btn-sm" id="empty-add-jd-btn-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Add Job Description
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="empty-upload-shortcut-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Upload Resumes
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="empty-try-demo-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Try Demo Mode
            </button>
          </div>
        </div>
      `;

      document.getElementById('empty-add-jd-btn-2')?.addEventListener('click', openJdEditor);
      document.getElementById('empty-upload-shortcut-btn')?.addEventListener('click', () => els.fileInput.click());
      document.getElementById('empty-try-demo-btn')?.addEventListener('click', toggleDemoMode);
      return;
    }

    const query = state.searchQuery.toLowerCase();
    const filtered = state.results.filter(cand => {
      // Score filter
      if (state.filter === 'top' && cand.score < 80) return false;
      if (state.filter === 'good' && (cand.score < 70 || cand.score >= 80)) return false;
      if (state.filter === 'review' && cand.score >= 70) return false;

      // Text Search
      if (query) {
        const nameMatch = (cand.name || '').toLowerCase().includes(query);
        const skillMatch = (cand.skills || []).some(s => s.toLowerCase().includes(query));
        const fileMatch = (cand.filename || '').toLowerCase().includes(query);
        return nameMatch || skillMatch || fileMatch;
      }
      return true;
    });

    if (filtered.length === 0) {
      els.bentoResultsGrid.innerHTML = `
        <div style="grid-column: span 2; padding: 48px; text-align: center; color: var(--text-muted);">
          <p style="font-size: 15px; margin-bottom: 8px;">No matching candidates found.</p>
          <button type="button" class="btn btn-secondary btn-sm" id="reset-filter-btn">Reset Filters</button>
        </div>
      `;
      const resetBtn = document.getElementById('reset-filter-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          state.filter = 'all';
          state.searchQuery = '';
          els.candidateSearchInput.value = '';
          document.querySelectorAll('.pill-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
          renderBentoGrid();
        });
      }
      return;
    }

    els.bentoResultsGrid.innerHTML = '';

    // If demo mode active, show demo banner at top of bento grid
    if (state.isDemo) {
      const banner = document.createElement('div');
      banner.className = 'demo-banner';
      banner.innerHTML = `
        <div class="demo-banner-left">
          <span class="demo-dot"></span>
          <span><strong>Demo Mode Active:</strong> Showing sample Amazon SDE-I evaluation data (${state.results.length} candidates).</span>
        </div>
        <button type="button" class="btn-text" id="demo-exit-inline-btn" style="color: var(--accent-light);">Exit Demo & Clear</button>
      `;
      banner.querySelector('#demo-exit-inline-btn').addEventListener('click', toggleDemoMode);
      els.bentoResultsGrid.appendChild(banner);
    }

    const circumference = 2 * Math.PI * 42; // r=42 -> ~263.89

    filtered.forEach((cand, idx) => {
      const isTop = idx === 0 && state.filter === 'all' && !query;
      const card = document.createElement('div');
      card.className = `bento-card ${isTop ? 'rank-first' : ''}`;

      const scoreOffset = circumference - (circumference * cand.score) / 100;
      const details = cand.details || {};
      const matchingSkills = details.matching_skills || (cand.skills || []).slice(0, 5);
      const verdict = details.final_verdict || details.verdict || 'Candidate qualifications analyzed against target criteria.';
      const expMet = (details.experience_met !== undefined && details.experience_met !== false) ? (typeof details.experience_met === 'string' ? details.experience_met : 'Experience Verified') : (details.experience_requirement_met ? 'Experience Verified' : (cand.total_experience_years ? `${cand.total_experience_years} Yrs Exp` : 'Fresher'));

      card.innerHTML = `
        <div class="card-top">
          <div class="candidate-lead">
            <span class="rank-indicator">#${idx + 1} RANKED ${isTop ? 'TOP MATCH' : ''}</span>
            <h3 class="candidate-name">${escapeHtml(cand.name)}</h3>
            <span class="candidate-source-file font-mono">${escapeHtml(cand.filename)}</span>
          </div>
          <div class="gauge-wrap">
            <svg class="radial-chart" viewBox="0 0 100 100">
              <circle class="circle-bg" cx="50" cy="50" r="42" stroke-width="7"></circle>
              <circle class="circle-progress" cx="50" cy="50" r="42" stroke-width="7" 
                stroke-dasharray="${circumference}" 
                stroke-dashoffset="${scoreOffset}"></circle>
            </svg>
            <div class="gauge-text">
              <span class="gauge-val font-mono">${cand.score}</span>
              <span class="gauge-symbol font-mono">%</span>
            </div>
          </div>
        </div>

        <div class="card-middle">
          <p class="card-verdict-quote font-sans">"${escapeHtml(verdict)}"</p>
          <div class="skills-preview-block">
            <span class="skills-preview-label">Core Match Highlights</span>
            <div class="tags-cluster">
              ${matchingSkills.slice(0, isTop ? 6 : 4).map(s => `<span class="tag tag-primary">${escapeHtml(s)}</span>`).join('')}
              ${matchingSkills.length > (isTop ? 6 : 4) ? `<span class="tag tag-muted">+${matchingSkills.length - (isTop ? 6 : 4)} more</span>` : ''}
            </div>
          </div>
        </div>

        <div class="card-bottom">
          <span class="exp-status-pill met">${escapeHtml(expMet)}</span>
          <button type="button" class="btn btn-secondary btn-sm inspect-btn" data-index="${idx}">
            Inspect Candidate
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      `;

      card.querySelector('.inspect-btn').addEventListener('click', () => {
        openCandidateInspector(cand, idx + 1);
      });

      card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          openCandidateInspector(cand, idx + 1);
        }
      });

      els.bentoResultsGrid.appendChild(card);
    });
  }

  // Open Candidate Inspector Drawer
  function openCandidateInspector(cand, rank) {
    state.selectedCandidate = cand;
    const details = cand.details || {};
    const circumference = 2 * Math.PI * 42;
    const scoreOffset = circumference - (circumference * cand.score) / 100;

    els.drawerCandidateName.textContent = cand.name;
    els.drawerRankTag.textContent = `RANK #${rank} CANDIDATE`;
    els.drawerFilename.textContent = cand.filename;
    els.drawerScoreVal.textContent = cand.score;
    els.drawerRadialProgress.style.strokeDashoffset = scoreOffset;

    els.drawerVerdictText.textContent = details.final_verdict || details.verdict || 'Candidate evaluation complete.';

    const expYrs = cand.total_experience_years !== undefined ? `${cand.total_experience_years} Years` : 'Unspecified';
    els.drawerExpYears.textContent = expYrs;

    const expMet = (details.experience_met !== undefined && details.experience_met !== false) ? (typeof details.experience_met === 'string' ? details.experience_met : 'Criteria Met') : 'Criteria Pending';
    els.drawerExpBadge.textContent = expMet;

    els.drawerEmail.textContent = cand.email || 'Not detected';
    els.drawerPhone.textContent = cand.phone || 'Not detected';

    // Skills
    const matching = details.matching_skills || cand.skills || [];
    const missing = details.missing_important_skills || [];

    els.drawerMatchingSkills.innerHTML = matching.length > 0
      ? matching.map(s => `<span class="tag tag-primary">${escapeHtml(s)}</span>`).join('')
      : '<span style="color: var(--text-muted); font-size: 13px;">No explicit matching skills listed</span>';

    els.drawerMissingSkills.innerHTML = missing.length > 0
      ? missing.map(s => `<span class="tag tag-danger">${escapeHtml(s)}</span>`).join('')
      : '<span style="color: var(--accent-light); font-size: 13px;">All major required skills matched</span>';

    // Experience Items
    els.drawerExperienceList.innerHTML = '';
    const experiences = cand.experiences || [];
    if (experiences.length > 0) {
      experiences.forEach(exp => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
          <div class="timeline-title">${escapeHtml(exp.role || 'Role')}</div>
          <div class="timeline-meta">${escapeHtml(exp.company || 'Company')} • ${escapeHtml(exp.duration || '')}</div>
          <div class="timeline-desc">${escapeHtml(exp.description || '')}</div>
        `;
        els.drawerExperienceList.appendChild(item);
      });
    } else {
      els.drawerExperienceList.innerHTML = '<p class="timeline-empty">No structured experience entries parsed.</p>';
    }

    // Education Items
    els.drawerEducationList.innerHTML = '';
    const education = cand.education || [];
    if (education.length > 0) {
      education.forEach(edu => {
        const li = document.createElement('li');
        li.textContent = edu;
        els.drawerEducationList.appendChild(li);
      });
    } else {
      els.drawerEducationList.innerHTML = '<li style="color: var(--text-muted);">No formal education details detected.</li>';
    }

    // Projects
    els.drawerProjectsList.innerHTML = '';
    const projects = cand.projects || [];
    if (projects.length > 0) {
      projects.forEach(proj => {
        const li = document.createElement('li');
        li.textContent = proj;
        els.drawerProjectsList.appendChild(li);
      });
    } else {
      els.drawerProjectsList.innerHTML = '<li style="color: var(--text-muted);">No projects listed.</li>';
    }

    els.inspectorBackdrop.classList.remove('hidden');
    els.inspectorDrawer.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  // Close Drawer
  function closeCandidateInspector() {
    els.inspectorBackdrop.classList.add('hidden');
    els.inspectorDrawer.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Nav & Hero Actions
    els.navRunBtn.addEventListener('click', runLiveAnalysis);
    els.heroRunBtn.addEventListener('click', runLiveAnalysis);

    els.navDemoBtn.addEventListener('click', toggleDemoMode);

    if (els.navResetBtn) {
      els.navResetBtn.addEventListener('click', async () => {
        try {
          await fetch('/api/reset', { method: 'POST' });
          state.isDemo = false;
          state.results = [];
          state.resumes = [];
          state.job = null;
          renderJobCriteria(null);
          renderVaultList([]);
          renderBentoGrid();
          els.navDemoBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            Demo Mode
          `;
          els.navDemoBtn.classList.remove('btn-active');
          showToast('All cache, job description, and uploaded resumes cleared!', 'success');
        } catch (err) {
          showToast('Failed to reset workspace.', 'error');
        }
      });
    }

    els.heroUploadShortcut.addEventListener('click', () => {
      els.uploadDropzone.scrollIntoView({ behavior: 'smooth' });
      els.fileInput.click();
    });

    els.refreshVaultBtn.addEventListener('click', async () => {
      await fetchResumesList();
      showToast('Vault refreshed.', 'normal');
    });

    // JD Editor Drawer Toggle
    els.toggleJdEditBtn.addEventListener('click', () => {
      const isHidden = els.jdEditorDrawer.classList.contains('hidden');
      if (isHidden) {
        openJdEditor();
      } else {
        closeJdEditor();
      }
    });

    els.cancelJdBtn.addEventListener('click', closeJdEditor);

    els.saveJdBtn.addEventListener('click', async () => {
      const newText = els.jdTextarea.value.trim();
      if (!newText) {
        showToast('Please enter job description text.', 'error');
        return;
      }
      els.saveJdBtn.disabled = true;
      els.saveJdBtn.textContent = 'Extracting Criteria...';
      try {
        const res = await fetch('/api/job/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_description: newText })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'Extraction failed');
        }
        const data = await res.json();
        state.job = data;
        state.isDemo = false;
        // If we had demo results before, clear them because criteria changed
        if (state.results.length > 0 && state.results.some(r => r.is_demo)) {
          state.results = [];
        }
        renderJobCriteria(data);
        closeJdEditor();
        renderBentoGrid();
        showToast('Job criteria extracted successfully with Groq AI!', 'success');
        if (state.resumes.length > 0) {
          showToast('Click "Start Evaluation" to score vault resumes against this role.', 'normal');
        }
      } catch (err) {
        showToast(`Failed to parse job description: ${err.message}`, 'error');
      } finally {
        els.saveJdBtn.disabled = false;
        els.saveJdBtn.textContent = 'Save & Extract Criteria';
      }
    });

    if (els.vaultUploadBtn) {
      els.vaultUploadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        els.fileInput.click();
      });
    }

    // Dropzone Events
    els.uploadDropzone.addEventListener('click', (e) => {
      e.stopPropagation();
      els.fileInput.click();
    });

    els.fileInput.addEventListener('change', (e) => {
      uploadFiles(e.target.files);
      els.fileInput.value = '';
    });

    els.uploadDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      els.uploadDropzone.classList.add('dragover');
    });

    els.uploadDropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      els.uploadDropzone.classList.remove('dragover');
    });

    els.uploadDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      els.uploadDropzone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    });

    // Search and Score Filters
    els.candidateSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      renderBentoGrid();
    });

    els.scoreFilters.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-btn');
      if (!btn) return;
      document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter = btn.dataset.filter;
      renderBentoGrid();
    });

    // Drawer Close
    els.drawerCloseBtn.addEventListener('click', closeCandidateInspector);
    els.inspectorBackdrop.addEventListener('click', closeCandidateInspector);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCandidateInspector();
      }
    });
  }

  // Initialize Application on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
