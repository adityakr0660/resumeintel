# 🎯 Resume Intelligence Studio (AI-Powered Talent Screener)

> **Precision resume screening and technical candidate evaluation powered by Groq LLM and structured Pydantic schemas.**

![Python](https://img.shields.io/badge/Python-3.11%2B-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?logo=fastapi)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![Groq](https://img.shields.io/badge/LLM-Groq%20Llama%203.3%2070B-f55036)

---

## 📌 Overview

Resume Intelligence Studio is a full-stack talent screening engine designed to evaluate technical resumes (`.pdf` and `.docx`) against custom Job Descriptions (JDs) in real time.

Instead of unstructured text answers, the system enforces **structured Pydantic schemas** with strict JSON outputs to calculate deterministic match percentages, extract verified skills, detect missing competencies, and generate recruiter-grade verdicts with zero hallucinations.

---

## ✨ Key Features

- **Semantic Role Extraction**: Paste any unstructured Job Description. The LLM extracts the exact target role, minimum years of experience, required skills, and preferred bonus skills.
- **Multi-Format Ingestion**: Supports `.pdf` and `.docx` parsing using `pypdf` and `python-docx`.
- **Structured Scoring Engine**: Enforces strict JSON contracts using Pydantic models (`CandidateScore`, `JobD`, `Resume`).
- **Explainable Match Scores**:
  - Radial score percentage gauge.
  - Verified matching skills vs missing/growth skills.
  - Recruiter verdict quote and experience verification.
- **High-Aesthetic Dark UI**: Designed with a **Modern Linear / Vercel Dark Tech** aesthetic:
  - Deep obsidian base (`#08080a`) with glowing emerald accents (`#10b981`).
  - Slide-over candidate inspector drawer.
  - Drag-and-drop vault with auto-evaluation.
- **Fast Local Cache**: Evaluated resumes are cached locally in `analysis_cache.json` to prevent duplicate LLM calls and conserve API tokens.

---

## 🏗️ Architecture

```
User uploads Resume (.pdf / .docx)
               │
               ▼
   [ FastAPI Upload Endpoint ]
               │
       ┌───────┴───────┐
       ▼               ▼
[ Text Extractor ] [ Text Extractor ]
 (pypdf for PDF)   (python-docx for DOCX)
       │               │
       └───────┬───────┘
               ▼
   [ Groq LLM Engine ]
   (llama-3.3-70b-versatile)
   Enforces JSON Structured Output
               │
       ┌───────┴───────┐
       ▼               ▼
[ Candidate Parser ] [ Skill Matcher ]
- Experience         - Match Percentage
- Verified Skills    - Missing Skills
- Projects           - Recruiter Verdict
       │               │
       └───────┬───────┘
               ▼
     [ Local Cache Store ]
               │
               ▼
 [ React Bento Grid Matrix ]
- Radial Score Gauges
- Slide-Over Candidate Drawer
```

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Asynchronous Python Web Framework)
- **AI / LLM**: Groq Cloud API (`llama-3.3-70b-versatile`)
- **Validation**: Pydantic v2
- **Document Parsers**: PyPDF, Python-Docx
- **Package Manager**: UV / Pip

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Vanilla CSS (Tokens, CSS Grid, Glassmorphism, Micro-animations)
- **Architecture**: Modular Components (`JobCriteriaStudio`, `ResumeVault`, `BentoMatrix`, `CandidateInspector`)

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/resume-analyzer.git
cd resume-analyzer
```

### 2. Configure Environment Variables
Copy the example environment file and add your Groq API key:
```bash
cp .env.example .env
```

Edit `.env`:
```env
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
```
*(Get a free API key from [Groq Console](https://console.groq.com/keys))*

---

### 3. Backend Setup (FastAPI)
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install fastapi uvicorn groq pydantic python-dotenv pypdf python-docx python-multipart

# Start the backend server
python app.py
```
> The API server will be live at `http://127.0.0.1:8000`

---

### 4. Frontend Setup (React + Vite)
Open a new terminal:
```bash
cd frontend

# Install npm dependencies
npm install

# Start development server
npm run dev
```
> The React frontend will be live at `http://127.0.0.1:5173`

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/job` | Get active job description & structured criteria |
| `POST` | `/api/job/parse` | Update and parse new job description text |
| `GET` | `/api/resumes` | List all uploaded resume files in vault |
| `POST` | `/api/upload` | Upload resume file and run instant AI evaluation |
| `DELETE` | `/api/resumes/{filename}` | Delete a resume file and clear its cache |
| `GET` | `/api/results` | Fetch all evaluated candidates sorted by score |
| `POST` | `/api/analyze` | Trigger batch analysis across vault resumes |
| `GET` | `/api/demo-data` | Fallback sample candidate evaluations for preview |

---

## 🎯 Key Interview Discussion Points

1. **Why FastAPI over Flask or Django?**
   - Native `async/await` handling makes it ideal for I/O-bound LLM API calls.
   - Built-in Pydantic integration ensures request/response schema validation out of the box.

2. **How is Hallucination Prevented?**
   - Using Groq's `response_format={"type": "json_object"}` coupled with strict Pydantic schemas forces the model to adhere to defined fields (`score`, `matching_skills`, `missing_important_skills`).

3. **How is API Cost and Latency Optimized?**
   - Implemented persistent disk caching (`analysis_cache.json`). Resumes that have already been evaluated are returned instantly without invoking additional LLM inference.
