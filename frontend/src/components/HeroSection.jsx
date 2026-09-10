import React from 'react';

export default function HeroSection({ vaultCount, onStartEvaluation, onUploadShortcut, isAnalyzing }) {
  return (
    <section className="hero-section" id="hero-block">
      <div className="hero-layout">
        <div className="hero-content">
          <div className="hero-tag-pill">
            <span className="live-dot" />
            <span>AI RECRUITER STUDIO V2.0</span>
          </div>
          <h1 className="hero-headline">Precision resume screening for engineering teams.</h1>
          <p className="hero-subtext">
            Evaluate technical resumes against your exact role criteria with explainable skill matching and scoring.
          </p>
          <div className="hero-actions">
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={onStartEvaluation}
              disabled={isAnalyzing}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {isAnalyzing ? 'Evaluating...' : 'Start Evaluation'}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onUploadShortcut}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Resumes
            </button>
          </div>
          <div className="hero-metrics">
            <span className="metric-item">
              <strong className="font-mono">{vaultCount}</strong> Resumes in Vault
            </span>
            <span className="metric-divider">/</span>
            <span className="metric-item">Groq LLM Engine</span>
            <span className="metric-divider">/</span>
            <span className="metric-item">Zero Hallucination</span>
          </div>
        </div>

        <div className="hero-asset-wrap">
          <div className="hero-media-card">
            <img 
              src="/hero_visual.jpg" 
              alt="AI Talent Intelligence Graph" 
              className="hero-media-img" 
              width="720" 
              height="405" 
            />
            <div className="hero-media-overlay">
              <div className="overlay-pill">
                <span className="live-dot" />
                <span>Structured Semantic Extraction</span>
              </div>
              <div className="overlay-badge font-mono">Ranked by Match %</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
