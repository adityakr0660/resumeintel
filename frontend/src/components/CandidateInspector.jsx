import React, { useEffect } from 'react';

export default function CandidateInspector({ candidate, rank, isOpen, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !candidate) return null;

  const circumference = 2 * Math.PI * 42;
  const scoreOffset = circumference - (circumference * candidate.score) / 100;
  const details = candidate.details || {};

  const verdict = details.final_verdict || details.verdict || 'Candidate evaluation completed against role requirements.';
  const expBadge = (details.experience_met !== undefined && details.experience_met !== false)
    ? (typeof details.experience_met === 'string' ? details.experience_met : 'Experience Requirement Met')
    : (details.experience_requirement_met ? 'Experience Requirement Met' : 'Review Experience');

  const expYears = candidate.total_experience_years !== null
    ? `${candidate.total_experience_years} Years Experience`
    : 'Academic / Project Experience';

  const matchingSkills = details.matching_skills || candidate.skills || [];
  const missingSkills = details.missing_important_skills || [];
  const experiences = candidate.experiences || [];
  const education = candidate.education || ['Degree in Engineering / STEM'];
  const projects = candidate.projects || ['Coursework and capstone development'];

  return (
    <>
      <div className="inspector-backdrop" onClick={onClose} />
      <aside className="inspector-drawer" aria-labelledby="drawer-candidate-name">
        <div className="drawer-header">
          <div className="drawer-header-info">
            <span className="drawer-tag font-mono">RANK #{rank} CANDIDATE</span>
            <h3 className="drawer-name" id="drawer-candidate-name">{candidate.name}</h3>
            <p className="drawer-file font-mono">{candidate.filename}</p>
          </div>
          <button 
            type="button" 
            className="drawer-close-btn" 
            onClick={onClose}
            aria-label="Close Inspector"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="drawer-body">
          {/* Score & Recruiter Verdict */}
          <div className="inspector-score-card">
            <div className="score-circle-lg">
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
              <div className="score-text-wrap">
                <span className="score-val font-mono">{candidate.score}</span>
                <span className="score-pct font-mono">%</span>
              </div>
            </div>
            <div className="score-summary-wrap">
              <div className="verdict-label font-mono">RECRUITER VERDICT</div>
              <p className="verdict-text">{verdict}</p>
              <div className="exp-check-row">
                <span className="exp-badge">{expBadge}</span>
                <span className="exp-years font-mono">{expYears}</span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="inspector-meta-row">
            <div className="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>{candidate.email || 'Email not listed'}</span>
            </div>
            <div className="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>{candidate.phone || 'Phone not listed'}</span>
            </div>
          </div>

          {/* Matching Skills */}
          <div className="inspector-section">
            <h4 className="inspector-section-title">Matching Skills</h4>
            <div className="tags-cluster">
              {matchingSkills.length === 0 ? (
                <span className="tag tag-muted">No exact skill matches identified</span>
              ) : (
                matchingSkills.map((s, idx) => (
                  <span key={idx} className="tag tag-primary">{s}</span>
                ))
              )}
            </div>
          </div>

          {/* Missing Skills */}
          <div className="inspector-section">
            <h4 className="inspector-section-title">Missing / Growth Skills</h4>
            <div className="tags-cluster">
              {missingSkills.length === 0 ? (
                <span className="tag tag-muted">None flagged</span>
              ) : (
                missingSkills.map((s, idx) => (
                  <span key={idx} className="tag tag-rose">{s}</span>
                ))
              )}
            </div>
          </div>

          {/* Work Experience */}
          <div className="inspector-section">
            <h4 className="inspector-section-title">Extracted Experience</h4>
            <div className="timeline-list">
              {experiences.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  No formal employment history parsed. Candidate exhibits project-based academic experience.
                </div>
              ) : (
                experiences.map((exp, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-role">{exp.role || 'Software Contributor'}</div>
                    <div className="timeline-company">
                      {exp.company || 'Organization'} · <span className="font-mono">{exp.duration || 'Duration'}</span>
                    </div>
                    {exp.description && <div className="timeline-desc">{exp.description}</div>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Education & Projects */}
          <div className="inspector-section">
            <h4 className="inspector-section-title">Education</h4>
            <ul className="bullet-list">
              {education.map((ed, idx) => (
                <li key={idx}>{ed}</li>
              ))}
            </ul>
          </div>

          <div className="inspector-section">
            <h4 className="inspector-section-title">Key Projects</h4>
            <ul className="bullet-list">
              {projects.map((proj, idx) => (
                <li key={idx}>{proj}</li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </>
  );
}
