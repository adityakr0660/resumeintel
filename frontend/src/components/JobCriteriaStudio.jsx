import React, { useState, useEffect } from 'react';

export default function JobCriteriaStudio({ jobData, onUpdateCriteria, isUpdating }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const structured = jobData?.structured;
  const hasJd = Boolean(jobData?.text && structured);

  useEffect(() => {
    if (jobData?.text) {
      setEditText(jobData.text);
    } else {
      setEditText('');
    }
  }, [jobData]);

  const handleSave = async () => {
    if (!editText.trim()) return;
    await onUpdateCriteria(editText);
    setIsEditing(false);
  };

  return (
    <div className="studio-card jd-panel">
      <div className="card-header">
        <div className="card-title-wrap">
          <h3 className="card-title">{structured?.role || 'Role Criteria (Not Set)'}</h3>
          <span className="badge font-mono">
            Min Exp: {structured?.minimum_experience !== null && structured?.minimum_experience !== undefined ? `${structured.minimum_experience} yr` : '--'}
          </span>
        </div>
        <button 
          type="button" 
          className="btn-text" 
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Close Editor' : (hasJd ? 'Edit Job Description' : '+ Add Job Description')}
        </button>
      </div>

      {!isEditing ? (
        hasJd ? (
          <div className="criteria-view">
            <div className="criteria-group">
              <div className="group-label">Required Skills ({(structured?.required_skills || []).length})</div>
              <div className="tags-cluster">
                {(structured?.required_skills || []).map((s, idx) => (
                  <span key={idx} className="tag tag-primary">{s}</span>
                ))}
              </div>
            </div>

            <div className="criteria-group">
              <div className="group-label">Preferred Skills ({(structured?.preferred_skills || []).length})</div>
              <div className="tags-cluster">
                {(structured?.preferred_skills || []).map((s, idx) => (
                  <span key={idx} className="tag tag-muted">{s}</span>
                ))}
              </div>
            </div>

            <div className="criteria-group">
              <div className="group-label">Education Requirements</div>
              <ul className="criteria-list">
                {(structured?.education_requirements || ['Degree in STEM or equivalent practical experience']).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="criteria-view">
            <div className="criteria-empty-box">
              <div className="empty-icon-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="empty-text">
                <strong>Define Target Criteria</strong>
                <p>Paste a job description so Groq AI can extract required skills, experience levels, and qualifications.</p>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => setIsEditing(true)}
              >
                + Add Job Description
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="jd-editor-drawer">
          <label className="editor-label">Paste or modify raw job description text:</label>
          <textarea 
            className="jd-input" 
            rows="8"
            placeholder="Paste target job description here (e.g. Job Role, Responsibilities, Required Skills, Minimum Experience)..."
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
          />
          <div className="editor-actions">
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary btn-sm"
              disabled={isUpdating}
              onClick={handleSave}
            >
              {isUpdating ? 'Extracting Criteria...' : 'Save & Extract Criteria'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
