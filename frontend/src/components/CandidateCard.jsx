import React from 'react';

export default function CandidateCard({ candidate, rank, isTop, onInspect }) {
  const circumference = 2 * Math.PI * 42; // ~263.89
  const scoreOffset = circumference - (circumference * candidate.score) / 100;
  const details = candidate.details || {};
  const matchingSkills = details.matching_skills || candidate.skills.slice(0, 5);
  const verdict = details.final_verdict || details.verdict || 'Candidate qualifications analyzed against target criteria.';
  
  const expMet = (details.experience_met !== undefined && details.experience_met !== false)
    ? (typeof details.experience_met === 'string' ? details.experience_met : 'Experience Verified')
    : (details.experience_requirement_met ? 'Experience Verified' : (candidate.total_experience_years ? `${candidate.total_experience_years} Yrs Exp` : 'Fresher'));

  const getTierBadge = (score) => {
    if (score >= 80) return { label: 'TOP TIER MATCH', class: 'tag-primary' };
    if (score >= 70) return { label: 'SOLID CONTENDER', class: 'tag-muted' };
    return { label: 'NEEDS REVIEW', class: 'tag-rose' };
  };

  const tier = getTierBadge(candidate.score);

  return (
    <div 
      className={`bento-card ${isTop ? 'rank-first' : ''}`}
      onClick={onInspect}
      style={{ cursor: 'pointer' }}
    >
      <div className="card-top">
        <div className="candidate-lead">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="rank-indicator font-mono">
              #{rank} RANKED
            </span>
            <span className={`tag ${tier.class} font-mono`} style={{ fontSize: '10px', padding: '2px 8px' }}>
              {tier.label}
            </span>
          </div>
          <h3 className="candidate-name">{candidate.name}</h3>
          <span className="candidate-source-file font-mono">{candidate.filename}</span>
        </div>
        <div className="gauge-wrap">
          <svg className="radial-chart" viewBox="0 0 100 100">
            <circle className="circle-bg" cx="50" cy="50" r="42" strokeWidth="7" />
            <circle 
              className="circle-progress" 
              cx="50" 
              cy="50" 
              r="42" 
              strokeWidth="7" 
              strokeDasharray={circumference} 
              strokeDashoffset={scoreOffset}
            />
          </svg>
          <div className="gauge-text">
            <span className="gauge-val font-mono">{candidate.score}</span>
            <span className="gauge-symbol font-mono">%</span>
          </div>
        </div>
      </div>

      <div className="card-middle">
        <p className="card-verdict-quote font-sans">"{verdict}"</p>
        <div className="skills-preview-block">
          <span className="skills-preview-label">Core Match Highlights</span>
          <div className="tags-cluster">
            {matchingSkills.slice(0, isTop ? 6 : 4).map((s, idx) => (
              <span key={idx} className="tag tag-primary">{s}</span>
            ))}
            {matchingSkills.length > (isTop ? 6 : 4) && (
              <span className="tag tag-muted">+{matchingSkills.length - (isTop ? 6 : 4)} more</span>
            )}
          </div>
        </div>
      </div>

      <div className="card-bottom">
        <span className="exp-status-pill met">{expMet}</span>
        <button 
          type="button" 
          className="btn btn-secondary btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            onInspect();
          }}
        >
          Inspect Candidate
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
