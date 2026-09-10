import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import JobCriteriaStudio from './components/JobCriteriaStudio';
import ResumeVault from './components/ResumeVault';
import BentoMatrix from './components/BentoMatrix';
import CandidateInspector from './components/CandidateInspector';
import Toast from './components/Toast';

import {
  getJobCriteria,
  updateJobCriteria,
  getResumes,
  uploadResumeFile,
  deleteResumeFile,
  getEvaluatedResults,
  runBatchAnalysis,
  getDemoData,
} from './services/api';

export default function App() {
  const [jobData, setJobData] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [results, setResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingCriteria, setIsUpdatingCriteria] = useState(false);

  // Inspector Drawer State
  const [inspectedCandidate, setInspectedCandidate] = useState(null);
  const [inspectedRank, setInspectedRank] = useState(1);

  // Toast Notifications
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'normal') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial Load
  useEffect(() => {
    async function loadData() {
      try {
        const [job, resumeList] = await Promise.all([
          getJobCriteria().catch(() => null),
          getResumes().catch(() => ({ resumes: [] })),
        ]);

        if (job) setJobData(job);
        if (resumeList) setResumes(resumeList.resumes || []);

        // Load evaluated results from server cache
        const evalRes = await getEvaluatedResults().catch(() => ({ results: [] }));
        if (evalRes.results && evalRes.results.length > 0) {
          setResults(evalRes.results);
        } else if (resumeList.resumes && resumeList.resumes.length > 0) {
          // Vault has resumes ready, run analysis
          triggerAnalysis();
        } else {
          // Default fallback demo data
          const demo = await getDemoData().catch(() => ({ results: [] }));
          if (demo.results) setResults(demo.results);
        }
      } catch (err) {
        addToast('Initial data synchronization error', 'error');
      }
    }
    loadData();
  }, [addToast]);

  // Run Analysis
  const triggerAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setProgressStep(20);

    const progressTimer = setInterval(() => {
      setProgressStep((prev) => (prev < 85 ? prev + 15 : prev));
    }, 1200);

    try {
      const data = await runBatchAnalysis();
      clearInterval(progressTimer);
      setProgressStep(100);

      if (data.results) {
        setResults(data.results);
        addToast(`Evaluated ${data.results.length} candidate resumes successfully.`, 'success');
      }
      if (data.errors && data.errors.length > 0) {
        data.errors.forEach((e) => {
          addToast(`Issue with ${e.filename}: ${e.error}`, 'error');
        });
      }
      setTimeout(() => {
        setIsAnalyzing(false);
        setProgressStep(0);
      }, 1000);
    } catch (err) {
      clearInterval(progressTimer);
      setIsAnalyzing(false);
      setProgressStep(0);
      addToast(`Analysis error: ${err.message}`, 'error');
    }
  };

  // Handle File Upload
  const handleUpload = async (fileList) => {
    setIsUploading(true);
    setIsAnalyzing(true);
    setProgressStep(30);

    for (const file of fileList) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['pdf', 'docx'].includes(ext)) {
        addToast(`Skipping ${file.name}: only PDF and DOCX supported.`, 'error');
        continue;
      }

      try {
        addToast(`Analyzing ${file.name} with Groq AI...`, 'normal');
        const data = await uploadResumeFile(file);
        if (data.candidate) {
          setResults((prev) => {
            const next = prev.filter((r) => r.filename !== file.name);
            next.unshift(data.candidate);
            return next.sort((a, b) => b.score - a.score);
          });
          addToast(`Evaluated ${data.candidate.name || file.name}! Match: ${data.candidate.score}%`, 'success');
        } else {
          addToast(`Uploaded ${file.name}`, 'success');
        }
      } catch (err) {
        addToast(`Upload failed for ${file.name}: ${err.message}`, 'error');
      }
    }

    setProgressStep(100);
    setTimeout(() => {
      setIsAnalyzing(false);
      setIsUploading(false);
      setProgressStep(0);
    }, 1000);

    // Refresh vault files
    const res = await getResumes().catch(() => null);
    if (res?.resumes) setResumes(res.resumes);
  };

  // Handle File Delete
  const handleDeleteResume = async (filename) => {
    try {
      await deleteResumeFile(filename);
      setResumes((prev) => prev.filter((f) => f.filename !== filename));
      setResults((prev) => prev.filter((r) => r.filename !== filename));
      addToast(`Deleted ${filename}`, 'normal');
    } catch (err) {
      addToast(`Failed to delete ${filename}`, 'error');
    }
  };

  // Handle Update Job Criteria
  const handleUpdateCriteria = async (text) => {
    setIsUpdatingCriteria(true);
    try {
      const data = await updateJobCriteria(text);
      setJobData(data);
      addToast('Updated role specifications extracted successfully.', 'success');
    } catch (err) {
      addToast(`Update criteria error: ${err.message}`, 'error');
    } finally {
      setIsUpdatingCriteria(false);
    }
  };

  // Demo Mode
  const handleDemoMode = async () => {
    try {
      const data = await getDemoData();
      if (data.results) {
        setResults(data.results);
        addToast('Switched to pre-computed demo evaluation data.', 'normal');
      }
    } catch (err) {
      addToast('Could not load demo data.', 'error');
    }
  };

  // Scroll to Dropzone and open file dialog
  const handleUploadShortcut = () => {
    const el = document.getElementById('upload-dropzone');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    const input = document.getElementById('resume-file-input');
    if (input) input.click();
  };

  return (
    <div className="app-container">
      <Navbar 
        targetRole={jobData?.structured?.role}
        onRunAnalysis={triggerAnalysis}
        onDemoMode={handleDemoMode}
        isAnalyzing={isAnalyzing}
      />

      <main className="app-main">
        <HeroSection 
          vaultCount={resumes.length}
          onStartEvaluation={triggerAnalysis}
          onUploadShortcut={handleUploadShortcut}
          isAnalyzing={isAnalyzing}
        />

        <section className="studio-section" id="studio-block">
          <div className="section-header">
            <h2 className="section-title">Evaluation Setup</h2>
            <p className="section-subtitle">
              Configure the target role specifications and manage candidate documents.
            </p>
          </div>

          <div className="studio-grid">
            <JobCriteriaStudio 
              jobData={jobData}
              onUpdateCriteria={handleUpdateCriteria}
              isUpdating={isUpdatingCriteria}
            />
            <ResumeVault 
              resumes={resumes}
              onUpload={handleUpload}
              onDelete={handleDeleteResume}
              onRefresh={async () => {
                const res = await getResumes().catch(() => null);
                if (res?.resumes) {
                  setResumes(res.resumes);
                  addToast('Vault refreshed.', 'normal');
                }
              }}
              isUploading={isUploading}
            />
          </div>
        </section>

        <BentoMatrix 
          results={results}
          isAnalyzing={isAnalyzing}
          progressStep={progressStep}
          onInspectCandidate={(candidate, rank) => {
            setInspectedCandidate(candidate);
            setInspectedRank(rank);
          }}
        />
      </main>

      <CandidateInspector 
        candidate={inspectedCandidate}
        rank={inspectedRank}
        isOpen={Boolean(inspectedCandidate)}
        onClose={() => setInspectedCandidate(null)}
      />

      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
