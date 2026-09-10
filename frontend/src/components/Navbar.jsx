import React from 'react';

export default function Navbar({ targetRole, onRunAnalysis, onDemoMode, isAnalyzing }) {
  return (
    <header className="app-header" id="main-nav">
      <div className="nav-container">
        <div className="nav-brand">
          <div className="brand-glyph">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <span className="brand-title">RESUME<span className="brand-accent">INTEL</span></span>
          <span className="brand-badge">REACT STUDIO</span>
        </div>

        <div className="nav-status">
          <span className="status-indicator" />
          <span className="status-text">{targetRole ? `Target: ${targetRole}` : 'Target: Software Development Engineer'}</span>
        </div>

        <div className="nav-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onDemoMode} title="Load sample candidates">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Demo Mode
          </button>
          <button 
            type="button" 
            className="btn btn-primary btn-sm" 
            onClick={onRunAnalysis}
            disabled={isAnalyzing}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            {isAnalyzing ? 'Evaluating...' : 'Run Analysis'}
          </button>
        </div>
      </div>
    </header>
  );
}
