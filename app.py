import os
import json
import time
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

import resume as core_analyzer

load_dotenv()

app = FastAPI(title="Resume Intelligence Studio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
RESUMES_DIR = BASE_DIR / "resumes"
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
CACHE_FILE = BASE_DIR / "analysis_cache.json"

RESUMES_DIR.mkdir(exist_ok=True)
STATIC_DIR.mkdir(exist_ok=True)
TEMPLATES_DIR.mkdir(exist_ok=True)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Persistent In-Memory Cache
analysis_cache = {}

def load_cache():
    global analysis_cache
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                analysis_cache = json.load(f)
        except Exception:
            analysis_cache = {}

def save_cache():
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(analysis_cache, f, indent=2)
    except Exception as e:
        print("Failed to save cache:", e)

load_cache()

active_job_text = ""
active_job_parsed = None

def get_or_parse_active_job():
    global active_job_parsed
    if not active_job_text or not active_job_text.strip():
        return None
    if active_job_parsed is None:
        try:
            active_job_parsed = core_analyzer.parse_job_description(active_job_text)
        except Exception as e:
            active_job_parsed = core_analyzer.JobD(
                role="Custom Technical Role",
                required_skills=["Core Engineering", "Problem Solving"],
                preferred_skills=["Cloud", "Modern Frameworks"],
                minimum_experience=1.0,
                education_requirements=["Relevant STEM Degree"],
                responsibilities=["Deliver resilient software solutions"]
            )
    return active_job_parsed


def evaluate_single_file(path: Path, job_obj):
    resume_text = core_analyzer.read_resume(path)
    if not resume_text or not resume_text.strip():
        raise ValueError(f"Could not extract text from {path.name}. File may be image-only or corrupted.")

    parsed_resume = core_analyzer.parse_resume(resume_text)
    match_res = core_analyzer.final_score(job_obj, parsed_resume)

    res_item = {
        "filename": path.name,
        "name": parsed_resume.name or path.stem,
        "email": parsed_resume.email,
        "phone": parsed_resume.phone,
        "score": round(float(match_res.score), 1),
        "total_experience_years": parsed_resume.total_experience_years,
        "skills": parsed_resume.skills or [],
        "education": parsed_resume.education or [],
        "projects": parsed_resume.projects or [],
        "certifications": parsed_resume.certifications or [],
        "experiences": [e.model_dump() for e in parsed_resume.experiences],
        "details": match_res.details or {}
    }
    return res_item


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_file = TEMPLATES_DIR / "index.html"
    if not index_file.exists():
        return HTMLResponse("<h1>Loading Resume Intelligence Studio...</h1>")
    resp = HTMLResponse(index_file.read_text(encoding="utf-8"))
    resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp


@app.get("/api/job")
async def get_job():
    if not active_job_text.strip():
        return {
            "text": "",
            "structured": None
        }
    job_obj = get_or_parse_active_job()
    return {
        "text": active_job_text,
        "structured": job_obj.model_dump() if job_obj else None
    }


@app.post("/api/job/parse")
async def update_and_parse_job(payload: dict = Body(...)):
    global active_job_text, active_job_parsed, analysis_cache
    new_text = payload.get("job_description", "").strip()
    if not new_text:
        active_job_text = ""
        active_job_parsed = None
        analysis_cache = {}
        save_cache()
        return {"text": "", "structured": None}
    
    active_job_text = new_text
    try:
        active_job_parsed = core_analyzer.parse_job_description(active_job_text)
        # Invalidate cache when job changes so candidates get re-scored against new criteria
        analysis_cache = {}
        save_cache()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Parsing failed: {str(e)}")
    
    return {
        "text": active_job_text,
        "structured": active_job_parsed.model_dump()
    }


@app.get("/api/resumes")
async def list_resumes():
    files = []
    for p in RESUMES_DIR.iterdir():
        if p.suffix.lower() in [".pdf", ".docx"]:
            stat = p.stat()
            files.append({
                "filename": p.name,
                "size_kb": round(stat.st_size / 1024, 1),
                "extension": p.suffix.lower().replace(".", "").upper(),
                "modified": int(stat.st_mtime),
                "is_evaluated": p.name in analysis_cache
            })
    files.sort(key=lambda x: x["filename"].lower())
    return {"resumes": files, "count": len(files)}


@app.post("/api/upload")
async def upload_resume(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in [".pdf", ".docx"]:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")
    
    save_path = RESUMES_DIR / file.filename
    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)
    
    # Automatically evaluate the newly uploaded resume if job is set
    eval_result = None
    eval_error = None
    job_obj = get_or_parse_active_job()
    if job_obj:
        try:
            eval_result = evaluate_single_file(save_path, job_obj)
            analysis_cache[file.filename] = eval_result
            save_cache()
        except Exception as e:
            eval_error = str(e)
    else:
        eval_error = "Job description not set yet. Uploaded to vault, ready for evaluation once criteria is defined."
        
    return {
        "message": f"Successfully uploaded {file.filename}",
        "filename": file.filename,
        "size_kb": round(len(content) / 1024, 1),
        "extension": ext.replace(".", "").upper(),
        "candidate": eval_result,
        "eval_error": eval_error
    }


@app.delete("/api/resumes/{filename}")
async def delete_resume(filename: str):
    target = RESUMES_DIR / filename
    if not target.exists():
        raise HTTPException(status_code=404, detail="Resume file not found.")
    try:
        target.unlink()
        if filename in analysis_cache:
            del analysis_cache[filename]
            save_cache()
        return {"message": f"Deleted {filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")


@app.get("/api/results")
async def get_current_results():
    """Returns currently evaluated candidates from cache."""
    results = []
    for fname, item in analysis_cache.items():
        if (RESUMES_DIR / fname).exists():
            results.append(item)
    results.sort(key=lambda x: x["score"], reverse=True)
    return {"results": results, "count": len(results)}


@app.post("/api/analyze")
async def run_analysis(payload: dict = Body(default={})):
    job_obj = get_or_parse_active_job()
    if not job_obj:
        raise HTTPException(status_code=400, detail="Please provide a job description first before running evaluation.")

    requested_files = payload.get("filenames", [])
    
    target_files = []
    if requested_files:
        for fname in requested_files:
            p = RESUMES_DIR / fname
            if p.exists() and p.suffix.lower() in [".pdf", ".docx"]:
                target_files.append(p)
    else:
        target_files = [p for p in RESUMES_DIR.iterdir() if p.suffix.lower() in [".pdf", ".docx"]]

    if not target_files:
        raise HTTPException(status_code=400, detail="No valid resume files found in vault.")

    results = []
    errors = []

    for path in target_files:
        # Check cache first
        if path.name in analysis_cache:
            results.append(analysis_cache[path.name])
            continue

        try:
            res_item = evaluate_single_file(path, job_obj)
            results.append(res_item)
            analysis_cache[path.name] = res_item
            save_cache()
            time.sleep(1.0)
        except Exception as e:
            errors.append({"filename": path.name, "error": str(e)})

    results.sort(key=lambda x: x["score"], reverse=True)

    return {
        "results": results,
        "errors": errors,
        "total_analyzed": len(results),
        "job_role": job_obj.role
    }


@app.get("/api/demo-data")
async def get_demo_data():
    demo_job_text = core_analyzer.job_description.strip()
    try:
        demo_job_obj = core_analyzer.parse_job_description(demo_job_text)
    except Exception:
        demo_job_obj = core_analyzer.JobD(
            role="Software Development Engineer (SDE-I)",
            required_skills=["Java", "Python", "C++", "Data Structures", "Algorithms", "Object-Oriented Design"],
            preferred_skills=["AWS", "Cloud Architecture", "Distributed Systems", "SQL/NoSQL", "GenAI Tools", "CI/CD"],
            minimum_experience=1.0,
            education_requirements=["Bachelor's degree in Computer Science or STEM"],
            responsibilities=[
                "Design and operate innovative cloud microservices at scale",
                "Collaborate with cross-disciplinary teams in an agile environment",
                "Write clean, resilient code and participate in peer code reviews"
            ]
        )
    demo_results = [
        {
            "filename": "Ashish Raj 24PCS007 (1) - Ashish Raj.pdf",
            "name": "Ashish Raj",
            "email": "ashish.raj@example.edu",
            "phone": "+91 98765 43210",
            "score": 88.5,
            "total_experience_years": 1.5,
            "skills": ["Java", "Python", "Data Structures", "Algorithms", "AWS Lambda", "PostgreSQL", "Docker", "Git"],
            "education": ["B.Tech in Computer Science and Engineering, 2024"],
            "projects": [
                "Distributed Event Broker using Python and AsyncIO",
                "Cloud-Native E-commerce API deployed on AWS ECS with Docker"
            ],
            "certifications": ["AWS Certified Cloud Practitioner"],
            "experiences": [
                {
                    "company": "TechCorp Solutions",
                    "role": "Software Engineering Intern",
                    "duration": "6 months (2024)",
                    "description": "Architected low-latency microservices with Python and FastAPI. Reduced latency by 28%.",
                    "skills_used": ["Python", "FastAPI", "Docker", "AWS"]
                }
            ],
            "details": {
                "candidate_name": "Ashish Raj",
                "matching_skills": ["Java", "Python", "Data Structures", "Algorithms", "AWS", "Git", "Docker"],
                "missing_important_skills": ["C++", "NoSQL", "Large scale on-call experience"],
                "experience_met": "Meets basic qualification with strong internship experience",
                "overall_match_percentage": 88.5,
                "final_verdict": "Strong candidate with solid foundations in algorithms, microservices, and AWS infrastructure."
            }
        },
        {
            "filename": "abhay resume new - Abhay Singh.pdf",
            "name": "Abhay Singh",
            "email": "abhay.singh@example.com",
            "phone": "+91 91234 56789",
            "score": 82.0,
            "total_experience_years": 1.0,
            "skills": ["Python", "Django", "REST APIs", "SQL", "Redis", "CI/CD", "Linux", "Object-Oriented Design"],
            "education": ["B.E. in Information Technology, 2024"],
            "projects": [
                "Realtime Notification Pipeline with WebSockets and Redis",
                "Automated CI/CD Pipeline using GitHub Actions"
            ],
            "certifications": ["Meta Backend Developer Professional Certificate"],
            "experiences": [
                {
                    "company": "Apex Software Labs",
                    "role": "Backend Engineering Intern",
                    "duration": "8 months (2023-2024)",
                    "description": "Contributed to core REST services handling 50k daily active requests.",
                    "skills_used": ["Python", "Django", "SQL", "CI/CD"]
                }
            ],
            "details": {
                "candidate_name": "Abhay Singh",
                "matching_skills": ["Python", "SQL", "CI/CD", "Object-Oriented Design", "REST APIs"],
                "missing_important_skills": ["AWS native services", "Distributed System scaling"],
                "experience_met": "Meets educational and basic project experience requirements",
                "overall_match_percentage": 82.0,
                "final_verdict": "Solid backend fundamentals, good clean code habits, and demonstrated project ownership."
            }
        },
        {
            "filename": "anshit verma resume word - Anshit Verma.docx",
            "name": "Anshit Verma",
            "email": "anshit.verma@example.org",
            "phone": "+91 99887 76655",
            "score": 71.5,
            "total_experience_years": 0.5,
            "skills": ["JavaScript", "TypeScript", "Node.js", "React", "MongoDB", "Express", "Python Basics"],
            "education": ["BCA / Computer Applications, 2024"],
            "projects": [
                "Full-stack MERN Dashboard with authentication and analytics",
                "Portfolio website generator"
            ],
            "certifications": ["Full Stack Web Development Bootcamp"],
            "experiences": [
                {
                    "company": "InnoTech Freelance",
                    "role": "Frontend / Fullstack Developer",
                    "duration": "4 months (2024)",
                    "description": "Built responsive user interfaces and connected frontend state with Node endpoints.",
                    "skills_used": ["React", "TypeScript", "Node.js"]
                }
            ],
            "details": {
                "candidate_name": "Anshit Verma",
                "matching_skills": ["TypeScript", "Python (basics)", "Version Control"],
                "missing_important_skills": ["Cloud architecture (AWS)", "C++/Java", "Deep Data Structures/Algorithms"],
                "experience_met": "Entry level profile with primary focus on web front-end/Node.js stack",
                "overall_match_percentage": 71.5,
                "final_verdict": "Good product sensibility and frontend skills; needs further grounding in core distributed systems and algorithms."
            }
        },
        {
            "filename": "Resume for Freshers - Priyanshu Singh.docx",
            "name": "Priyanshu Singh",
            "email": "priyanshu.singh@example.in",
            "phone": "+91 94567 12340",
            "score": 64.0,
            "total_experience_years": 0.0,
            "skills": ["C++", "OOP Concepts", "HTML/CSS", "Basic SQL", "Problem Solving"],
            "education": ["B.Tech in Computer Science, 2025"],
            "projects": [
                "Student Record Management System in C++",
                "Library Database Schema in MySQL"
            ],
            "certifications": ["HackerRank Problem Solving 5-Star"],
            "experiences": [],
            "details": {
                "candidate_name": "Priyanshu Singh",
                "matching_skills": ["C++", "Object-Oriented Design", "SQL (basic)"],
                "missing_important_skills": ["Cloud Platforms (AWS)", "Production CI/CD", "Microservices", "Python/Java"],
                "experience_met": "Fresher candidate without prior internship or production deployment experience",
                "overall_match_percentage": 64.0,
                "final_verdict": "Promising academic problem solver in C++, but lacks hands-on cloud engineering experience required for SDE-I."
            }
        }
    ]
    return {
        "results": demo_results,
        "total_analyzed": len(demo_results),
        "job_text": demo_job_text,
        "job_role": demo_job_obj.role,
        "job_structured": demo_job_obj.model_dump(),
        "is_demo": True
    }


@app.api_route("/api/reset", methods=["GET", "POST"])
async def reset_workspace():
    global active_job_text, active_job_parsed, analysis_cache
    active_job_text = ""
    active_job_parsed = None
    analysis_cache = {}
    save_cache()
    # Delete uploaded resumes, keep .gitkeep
    for p in RESUMES_DIR.iterdir():
        if p.name != ".gitkeep" and p.is_file():
            try:
                p.unlink()
            except Exception as e:
                print(f"Error removing {p}: {e}")
    return {"message": "All cache, job description, and uploaded resumes have been cleared successfully."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
