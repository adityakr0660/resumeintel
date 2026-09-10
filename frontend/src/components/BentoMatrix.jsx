import React, { useState, useMemo } from 'react';
import CandidateCard from './CandidateCard';

export default function BentoMatrix({ results, isAnalyzing, progressStep, onInspectCandidate }) {
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

      {/* Bento Grid */}
      <div className="bento-grid">
        {filteredCandidates.length === 0 ? (
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
