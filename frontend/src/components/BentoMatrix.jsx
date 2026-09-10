import React, { useState, useMemo } from 'react';
import CandidateCard from './CandidateCard';

export default function BentoMatrix({ 
  results, 
  isAnalyzing, 
  progressStep, 
  onInspectCandidate, 
  onTryDemo, 
  onUploadShortcut,
  isDemo 
}) {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCandidates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return results.filter((cand) => {
      // Score filter
      if (filter === 'top' && cand.score < 80) return false;
      if (filter === 'good' && (cand.score < 70 || cand.score >= 80)) return false;
      if (filter === 'review' && cand.score >= 70) return false;

      // Text search
      if (q) {
        const nameMatch = (cand.name || '').toLowerCase().includes(q);
        const skillMatch = (cand.skills || []).some((s) => s.toLowerCase().includes(q));
        const fileMatch = (cand.filename || '').toLowerCase().includes(q);
        return nameMatch || skillMatch || fileMatch;
      }
      return true;
    });
  }, [results, filter, searchQuery]);

  return (
    <section className="matrix-section" id="matrix-block">
      <div className="section-header">
        <div className="header-left">
          <div className="hero-eyebrow">CANDIDATE RANKINGS</div>
          <h2 className="section-title">Evaluation Matrix</h2>
          <p className="section-subtitle">
            Candidates scored by qualification relevance, skill match, and experience verification.
          </p>
        </div>
        <div className="header-filters">
          <div className="search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input 
              type="text" 
              placeholder="Filter by candidate or skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-pills" id="score-filters">
            <button 
              type="button" 
              className={`pill-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              type="button" 
              className={`pill-btn ${filter === 'top' ? 'active' : ''}`}
              onClick={() => setFilter('top')}
            >
              Top Match (80%+)
            </button>
            <button 
              type="button" 
              className={`pill-btn ${filter === 'good' ? 'active' : ''}`}
              onClick={() => setFilter('good')}
            >
              Good (70-79%)
            </button>
            <button 
              type="button" 
              className={`pill-btn ${filter === 'review' ? 'active' : ''}`}
              onClick={() => setFilter('review')}
            >
              Review (&lt;70%)
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Progress Bar */}
      {isAnalyzing && (
        <div className="analysis-progress-panel">
          <div className="progress-bar-wrap">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progressStep}%` }} 
            />
          </div>
          <div className="progress-status-row">
            <span className="progress-label">Evaluating candidate resumes with Groq LLM...</span>
            <span className="progress-percent font-mono">{progressStep}%</span>
          </div>
        </div>
      )}

      {/* Demo Banner */}
      {isDemo && results.length > 0 && (
        <div className="demo-banner">
          <div className="demo-banner-left">
            <span className="demo-dot" />
            <span><strong>Demo Mode Active:</strong> Showing sample evaluation data for Amazon SDE-I ({results.length} candidates).</span>
          </div>
          <button type="button" className="btn-text" onClick={onTryDemo} style={{ color: 'var(--accent-light)' }}>
            Exit Demo & Clear
          </button>
        </div>
      )}

      {/* Bento Grid */}
      <div className="bento-grid">
        {results.length === 0 ? (
          <div className="bento-empty-wrapper">
            <div className="empty-halo-glow" />
            <div className="empty-icon-shield">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <h3 className="bento-empty-title">Ready for Candidate Evaluation</h3>
            <p className="bento-empty-subtitle">
              Configure your target job description and upload candidate resumes (PDF or DOCX) in the vault to evaluate, score, and rank qualifications with Groq AI.
            </p>
            <div className="workflow-steps-pill-bar">
              <div className="workflow-pill-step">
                <span className="pill-step-index">1</span>
                <span>Add Job Description</span>
              </div>
              <span className="workflow-step-divider">→</span>
              <div className="workflow-pill-step">
                <span className="pill-step-index">2</span>
                <span>Upload Resumes</span>
              </div>
              <span className="workflow-step-divider">→</span>
              <div className="workflow-pill-step">
                <span className="pill-step-index">3</span>
                <span>Analyze & Rank</span>
              </div>
            </div>
            <div className="empty-cta-group">
              <button type="button" className="btn btn-secondary btn-sm" onClick={onUploadShortcut}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload Resumes
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onTryDemo}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Try Demo Mode
              </button>
            </div>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div style={{ gridColumn: 'span 2', padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '15px', marginBottom: '12px' }}>No matching candidates found.</p>
            {(filter !== 'all' || searchQuery) && (
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setFilter('all');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          filteredCandidates.map((cand, idx) => {
            const isTop = idx === 0 && filter === 'all' && !searchQuery;
            return (
              <CandidateCard 
                key={cand.filename || idx}
                candidate={cand}
                rank={idx + 1}
                isTop={isTop}
                onInspect={() => onInspectCandidate(cand, idx + 1)}
              />
            );
          })
        )}
      </div>
    </section>
  );
}
