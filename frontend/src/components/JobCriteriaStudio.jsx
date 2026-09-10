import React, { useState, useEffect } from 'react';

export default function JobCriteriaStudio({ jobData, onUpdateCriteria, isUpdating }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const structured = jobData?.structured || {};

  useEffect(() => {
    if (jobData?.text) {
      setEditText(jobData.text);
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
          <h3 className="card-title">{structured.role || 'Role Criteria'}</h3>
          <span className="badge font-mono">
            Min Exp: {structured.minimum_experience !== null ? `${structured.minimum_experience} yr` : 'Flexible'}
          </span>
        </div>
        <button 
          type="button" 
          className="btn-text" 
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Close Editor' : 'Edit Job Description'}
        </button>
      </div>

      {!isEditing ? (
        <div className="criteria-view">
          <div className="criteria-group">
            <div className="group-label">Required Skills</div>
            <div className="tags-cluster">
              {(structured.required_skills || ['Java', 'Python', 'Data Structures', 'Algorithms', 'OOP']).map((s, idx) => (
                <span key={idx} className="tag tag-primary">{s}</span>
              ))}
            </div>
          </div>

          <div className="criteria-group">
            <div className="group-label">Preferred Skills</div>
            <div className="tags-cluster">
              {(structured.preferred_skills || ['AWS', 'Distributed Systems', 'SQL', 'CI/CD']).map((s, idx) => (
                <span key={idx} className="tag tag-muted">{s}</span>
              ))}
            </div>
          </div>

          <div className="criteria-group">
            <div className="group-label">Education Requirements</div>
            <ul className="criteria-list">
              {(structured.education_requirements || ["Bachelor's degree in Computer Science or STEM"]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="jd-editor-drawer">
          <label htmlFor="react-jd-textarea" className="editor-label">
            Paste or modify raw job description text:
          </label>
          <textarea 
            id="react-jd-textarea"
            className="jd-input" 
            rows="8" 
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Paste target job description here..."
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
              onClick={handleSave}
              disabled={isUpdating}
            >
              {isUpdating ? 'Extracting...' : 'Update & Re-Extract'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
