import React, { useRef, useState } from 'react';

export default function ResumeVault({ resumes, onUpload, onDelete, onRefresh, isUploading }) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    onUpload(Array.from(files));
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="studio-card vault-panel">
      <div className="card-header">
        <div className="card-title-wrap">
          <h3 className="card-title">Candidate Vault</h3>
          <span className="badge font-mono">{resumes.length} Resumes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            + Upload
          </button>
          <button type="button" className="btn-text" onClick={onRefresh}>Refresh</button>
        </div>
      </div>

      {/* Hidden File Input outside container to prevent event bubbling recursion */}
      <input 
        id="resume-file-input"
        type="file" 
        ref={fileInputRef} 
        accept=".pdf,.docx" 
        multiple 
        disabled={isUploading}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }} 
        style={{ display: 'none' }}
      />

      {/* Interactive Dropzone */}
      <div 
        id="upload-dropzone"
        role="button"
        tabIndex={0}
        className={`dropzone ${isDragOver ? 'dragover' : ''} ${isUploading ? 'uploading' : ''}`}
        onClick={() => {
          if (!isUploading && fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isUploading) {
            fileInputRef.current?.click();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ cursor: isUploading ? 'wait' : 'pointer' }}
      >
        <div className="dropzone-icon">
          {isUploading ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner-icon">
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}
        </div>

        <div className="dropzone-prompt">
          {isUploading ? (
            <strong style={{ color: 'var(--accent-light)' }}>
              Analyzing resume with Groq AI... Please wait
            </strong>
          ) : (
            <>
              <strong>Click to browse files</strong> or drag & drop here
            </>
          )}
        </div>

        <div className="dropzone-hint">
          {isUploading ? 'Extracting candidate profile and scoring against criteria...' : 'Supports PDF and DOCX (auto-evaluated upon upload)'}
        </div>
      </div>

      {/* Vault Files List */}
      <div className="vault-list">
        {resumes.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
            No resumes in vault. Click above or drop files to upload.
          </div>
        ) : (
          resumes.map((file) => (
            <div key={file.filename} className="vault-item">
              <div className="file-info">
                <span className="ext-badge">{file.extension}</span>
                <div>
                  <div className="file-name" title={file.filename}>{file.filename}</div>
                  <div className="file-size">{file.size_kb} KB</div>
                </div>
              </div>
              <button 
                type="button" 
                className="btn-icon-del" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(file.filename);
                }}
                title="Remove file"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
