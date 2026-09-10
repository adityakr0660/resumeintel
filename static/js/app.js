/**
 * Resume Intelligence Studio - Client Controller
 * Governed by .agents/skills/design-taste-frontend/SKILL.md
 * Strict anti-slop rules: zero em-dashes, tactile spring feedback, full UI state cycles.
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
    selectedCandidate: null
  };

  // DOM Elements
  const els = {
    activeRolePill: document.getElementById('active-role-pill'),
    navDemoBtn: document.getElementById('nav-demo-btn'),
    navRunBtn: document.getElementById('nav-run-btn'),
    heroRunBtn: document.getElementById('hero-run-btn'),
    heroUploadShortcut: document.getElementById('hero-upload-shortcut'),
    vaultCountStat: document.getElementById('vault-count-stat'),
    vaultBadgeCount: document.getElementById('vault-badge-count'),
    jobRoleDisplay: document.getElementById('job-role-display'),
    jobExpDisplay: document.getElementById('job-exp-display'),
    requiredSkillsTags: document.getElementById('required-skills-tags'),
    preferredSkillsTags: document.getElementById('preferred-skills-tags'),
    educationList: document.getElementById('education-requirements-list'),
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

  // Load Initial Data
  async function init() {
    await fetchJobCriteria();
    await fetchResumesList();

    // First check if server already has evaluated candidates in cache
    let hasEvaluated = false;
    try {
      const res = await fetch('/api/results');
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          state.results = data.results;
          renderBentoGrid();
          hasEvaluated = true;
        }
      }
    } catch (e) {
      console.warn('Could not fetch cached results:', e);
    }

    if (!hasEvaluated) {
      if (state.resumes.length > 0) {
        // Vault has resumes ready to evaluate
        await runLiveAnalysis();
      } else {
        // Empty vault: load demo data for preview
        await loadDemoData();
      }
    }

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
      showToast('Could not load role criteria.', 'error');
    }
  }

  // Render Target Criteria
  function renderJobCriteria(jobData) {
    const st = jobData.structured || {};
    els.activeRolePill.textContent = `Target: ${st.role || 'Software Engineer'}`;
    els.jobRoleDisplay.textContent = st.role || 'Role Criteria';
    els.jobExpDisplay.textContent = `Min Exp: ${st.minimum_experience !== null ? st.minimum_experience + ' yr' : 'Flexible'}`;
    els.jdTextarea.value = jobData.text || '';

    // Required Skills
    els.requiredSkillsTags.innerHTML = '';
    (st.required_skills || []).forEach(skill => {
      const tag = document.createElement('span');
      tag.className = 'tag tag-primary';
      tag.textContent = skill;
      els.requiredSkillsTags.appendChild(tag);
    });

    // Preferred Skills
    els.preferredSkillsTags.innerHTML = '';
    (st.preferred_skills || []).forEach(skill => {
      const tag = document.createElement('span');
      tag.className = 'tag tag-muted';
      tag.textContent = skill;
      els.preferredSkillsTags.appendChild(tag);
    });

    // Education
    els.educationList.innerHTML = '';
    (st.education_requirements || ['Degree in Computer Science or related STEM field']).forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      els.educationList.appendChild(li);
    });
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
          <span class="ext-badge">${file.extension}</span>
          <div>
            <div class="file-name" title="${file.filename}">${file.filename}</div>
            <div class="file-size">${file.size_kb} KB</div>
          </div>
        </div>
        <button type="button" class="btn-icon-del" data-filename="${file.filename}" title="Remove file">
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

  // Upload Handler with Automatic Immediate Evaluation
  async function uploadFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    els.analysisProgressBox.classList.remove('hidden');
    els.progressBarFill.style.width = '30%';
    els.progressPercentText.textContent = '30%';
    els.progressStatusText.textContent = 'Uploading and evaluating candidate profile with Groq AI...';

    for (const file of fileList) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['pdf', 'docx'].includes(ext)) {
        showToast(`Skipping ${file.name}: only PDF and DOCX supported.`, 'error');
        continue;
      }
      const formData = new FormData();
      formData.append('file', file);

      try {
        els.progressStatusText.textContent = `Analyzing ${file.name} with Groq LLM...`;
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();

        if (data.candidate) {
          // Remove old entry for same filename if any, then insert evaluated candidate
          state.results = state.results.filter(r => r.filename !== file.name);
          state.results.unshift(data.candidate);
          state.results.sort((a, b) => b.score - a.score);
          renderBentoGrid();
          showToast(`Evaluated ${data.candidate.name || file.name}! Match: ${data.candidate.score}%`, 'success');
        } else {
          showToast(`Uploaded ${file.name}`, 'success');
        }

        if (data.eval_error) {
          showToast(`Evaluation notice for ${file.name}: ${data.eval_error}`, 'normal');
        }
      } catch (err) {
        showToast(`Upload failed for ${file.name}`, 'error');
      }
    }

    els.progressBarFill.style.width = '100%';
    els.progressPercentText.textContent = '100%';
    els.progressStatusText.textContent = 'Candidate processing complete.';
    setTimeout(() => {
      els.analysisProgressBox.classList.add('hidden');
    }, 1200);

    await fetchResumesList();
  }

  // Load Demo Data
  async function loadDemoData() {
    try {
      const res = await fetch('/api/demo-data');
      if (!res.ok) throw new Error('Demo data unavailable');
      const data = await res.json();
      state.results = data.results || [];
      renderBentoGrid();
    } catch (err) {
      showToast('Could not load demo evaluations.', 'error');
    }
  }

  // Trigger Live Analysis
  async function runLiveAnalysis() {
    if (state.isAnalyzing) return;
    if (state.resumes.length === 0) {
      showToast('Please upload at least one resume to evaluate.', 'error');
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
        const errJson = await res.json();
        throw new Error(errJson.detail || 'Analysis request failed');
      }

      const data = await res.json();
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
    const circumference = 2 * Math.PI * 42; // r=42 -> ~263.89

    filtered.forEach((cand, idx) => {
      const isTop = idx === 0 && state.filter === 'all' && !query;
      const card = document.createElement('div');
      card.className = `bento-card ${isTop ? 'rank-first' : ''}`;

      const scoreOffset = circumference - (circumference * cand.score) / 100;
      const details = cand.details || {};
      const matchingSkills = details.matching_skills || cand.skills.slice(0, 5);
      const verdict = details.final_verdict || details.verdict || 'Candidate qualifications analyzed against target criteria.';
      const expMet = (details.experience_met !== undefined && details.experience_met !== false) ? (typeof details.experience_met === 'string' ? details.experience_met : 'Experience Verified') : (details.experience_requirement_met ? 'Experience Verified' : (cand.total_experience_years ? `${cand.total_experience_years} Yrs Exp` : 'Fresher'));

      card.innerHTML = `
        <div class="card-top">
          <div class="candidate-lead">
            <span class="rank-indicator">#${idx + 1} RANKED ${isTop ? 'TOP MATCH' : ''}</span>
            <h3 class="candidate-name">${cand.name}</h3>
            <span class="candidate-source-file font-mono">${cand.filename}</span>
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
          <p class="card-verdict-quote font-sans">"${verdict}"</p>
          <div class="skills-preview-block">
            <span class="skills-preview-label">Core Match Highlights</span>
            <div class="tags-cluster">
              ${matchingSkills.slice(0, isTop ? 6 : 4).map(s => `<span class="tag tag-primary">${s}</span>`).join('')}
              ${matchingSkills.length > (isTop ? 6 : 4) ? `<span class="tag tag-muted">+${matchingSkills.length - (isTop ? 6 : 4)} more</span>` : ''}
            </div>
          </div>
        </div>

        <div class="card-bottom">
          <span class="exp-status-pill met">${expMet}</span>
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

    els.drawerRadialProgress.style.strokeDasharray = `${circumference}`;
    els.drawerRadialProgress.style.strokeDashoffset = `${scoreOffset}`;

    els.drawerVerdictText.textContent = details.final_verdict || details.verdict || 'Candidate evaluation completed against role requirements.';
    const drawerExpText = (details.experience_met !== undefined && details.experience_met !== false) ? (typeof details.experience_met === 'string' ? details.experience_met : 'Experience Requirement Met') : (details.experience_requirement_met ? 'Experience Requirement Met' : 'Review Experience');
    els.drawerExpBadge.textContent = drawerExpText;
    els.drawerExpYears.textContent = cand.total_experience_years !== null ? `${cand.total_experience_years} Years Experience` : 'Academic / Project Experience';

    els.drawerEmail.textContent = cand.email || 'Email not listed';
    els.drawerPhone.textContent = cand.phone || 'Phone not listed';

    // Matching Skills
    els.drawerMatchingSkills.innerHTML = '';
    const matches = details.matching_skills || cand.skills || [];
    if (matches.length === 0) {
      els.drawerMatchingSkills.innerHTML = '<span class="tag tag-muted">No exact skill matches identified</span>';
    } else {
      matches.forEach(skill => {
        const tag = document.createElement('span');
        tag.className = 'tag tag-primary';
        tag.textContent = skill;
        els.drawerMatchingSkills.appendChild(tag);
      });
    }

    // Missing Skills
    els.drawerMissingSkills.innerHTML = '';
    const missing = details.missing_important_skills || [];
    if (missing.length === 0) {
      els.drawerMissingSkills.innerHTML = '<span class="tag tag-muted">None flagged</span>';
    } else {
      missing.forEach(skill => {
        const tag = document.createElement('span');
        tag.className = 'tag tag-rose';
        tag.textContent = skill;
        els.drawerMissingSkills.appendChild(tag);
      });
    }

    // Experiences Timeline
    els.drawerExperienceList.innerHTML = '';
    const experiences = cand.experiences || [];
    if (experiences.length === 0) {
      els.drawerExperienceList.innerHTML = `
        <div style="font-size: 12.5px; color: var(--text-muted);">
          No formal employment history parsed. Candidate exhibits project-based academic experience.
        </div>`;
    } else {
      experiences.forEach(exp => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
          <div class="timeline-role">${exp.role || 'Software Contributor'}</div>
          <div class="timeline-company">${exp.company || 'Organization'} · <span class="font-mono">${exp.duration || 'Duration'}</span></div>
          <div class="timeline-desc">${exp.description || ''}</div>
        `;
        els.drawerExperienceList.appendChild(item);
      });
    }

    // Education
    els.drawerEducationList.innerHTML = '';
    (cand.education || ['Degree in Engineering / STEM']).forEach(ed => {
      const li = document.createElement('li');
      li.textContent = ed;
      els.drawerEducationList.appendChild(li);
    });

    // Projects
    els.drawerProjectsList.innerHTML = '';
    (cand.projects || ['Coursework and capstone development']).forEach(proj => {
      const li = document.createElement('li');
      li.textContent = proj;
      els.drawerProjectsList.appendChild(li);
    });

    // Show Drawer & Backdrop
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

    els.navDemoBtn.addEventListener('click', async () => {
      showToast('Switched to pre-computed demo evaluation data.', 'normal');
      await loadDemoData();
    });

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
      els.jdEditorDrawer.classList.toggle('hidden');
      els.toggleJdEditBtn.textContent = isHidden ? 'Close Editor' : 'Edit Job Description';
    });

    els.cancelJdBtn.addEventListener('click', () => {
      els.jdEditorDrawer.classList.add('hidden');
      els.toggleJdEditBtn.textContent = 'Edit Job Description';
    });

    els.saveJdBtn.addEventListener('click', async () => {
      const newText = els.jdTextarea.value.trim();
      if (!newText) {
        showToast('Please enter job description text.', 'error');
        return;
      }
      els.saveJdBtn.textContent = 'Extracting...';
      try {
        const res = await fetch('/api/job/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_description: newText })
        });
        if (!res.ok) throw new Error('Extraction failed');
        const data = await res.json();
        state.job = data;
        renderJobCriteria(data);
        els.jdEditorDrawer.classList.add('hidden');
        els.toggleJdEditBtn.textContent = 'Edit Job Description';
        showToast('Updated role specifications extracted successfully.', 'success');
      } catch (err) {
        showToast('Failed to update job criteria via LLM.', 'error');
      } finally {
        els.saveJdBtn.textContent = 'Update & Re-Extract';
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
